import * as cdk from "aws-cdk-lib";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as firehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";
import { ChatBotApi } from "../chatbot-api";
import { NagSuppressions } from "cdk-nag";


export interface WebsiteProps {
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly api: ChatBotApi;
  readonly websiteBucket: s3.Bucket;
  readonly websiteKey: kms.Key;
}

export class Website extends Construct {
  readonly distribution: cf.CloudFrontWebDistribution;

  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id);

    /////////////////////////////////////
    ///// CLOUDFRONT IMPLEMENTATION /////
    /////////////////////////////////////

    const originAccessControl = new cf.CfnOriginAccessControl(this, "OAC", {
      originAccessControlConfig: {
        name: "WebsiteBucketOAC",
        description: "OAC for Website Bucket",
        signingBehavior: "always", // Ensure all requests to the S3 bucket are signed
        signingProtocol: "sigv4",  // Use Signature Version 4
        originAccessControlOriginType: "s3",
      },
    }
    )

    const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebACLMetric',
        sampledRequestsEnabled: true,
      },      
      rules: [
        {
          name: 'CoreRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'CoreRuleSetMetric',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    const distributionLogsBucket = new s3.Bucket(
      this,
      "DistributionLogsBucket",
      {
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: true,
        encryption: s3.BucketEncryption.KMS_MANAGED,
      }
    );

    const distribution = new cf.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        // CUSTOM DOMAIN FOR PUBLIC WEBSITE
        // REQUIRES:
        // 1. ACM Certificate ARN in us-east-1 and Domain of website to be input during 'npm run config':
        //    "privateWebsite" : false,
        //    "certificate" : "arn:aws:acm:us-east-1:1234567890:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
        //    "domain" : "sub.example.com"
        // 2. After the deployment, in your Route53 Hosted Zone, add an "A Record" that points to the Cloudfront Alias (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)
        // ...(props.config.certificate && props.config.domain && {
        //   viewerCertificate: cf.ViewerCertificate.fromAcmCertificate(
        //     acm.Certificate.fromCertificateArn(this,'CloudfrontAcm', props.config.certificate),
        //     {
        //       aliases: [props.config.domain]
        //     })
        // }),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        priceClass: cf.PriceClass.PRICE_CLASS_ALL,
        httpVersion: cf.HttpVersion.HTTP2_AND_3,
        webACLId: webAcl.attrArn,
        loggingConfig: {
          bucket: distributionLogsBucket,
        },
        originConfigs: [
          {
            behaviors: [{ isDefaultBehavior: true }],
            s3OriginSource: {
              s3BucketSource: props.websiteBucket,
              // originAccessIdentity,
            },
          }
        ],
        // geoRestriction: cfGeoRestrictEnable ? cf.GeoRestriction.allowlist(...cfGeoRestrictList): undefined,
        errorConfigurations: [
          {
            errorCode: 404,
            errorCachingMinTtl: 0,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
          {
            errorCode: 403,
            errorCachingMinTtl: 0,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );

    this.distribution = distribution;

    const destinationBucket = new s3.Bucket(this, 'FirehoseDestinationBucket',{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      enforceSSL: true,      
    });
    
    const deliveryStreamRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    const stream = new firehose.CfnDeliveryStream(this, 'WAFStream', {
      deliveryStreamName: 'aws-waf-logs-stream',
      s3DestinationConfiguration: {
        bucketArn: destinationBucket.bucketArn,
        roleArn: deliveryStreamRole.roleArn,
      },
    });

    const loggingConfig = new wafv2.CfnLoggingConfiguration(this, 'WAFLoggingConfig', {
      logDestinationConfigs: [stream.attrArn],
      resourceArn: webAcl.attrArn,
    });

    // Attach OAC to distribution to allow access to the website bucket
    const cfnDistribution = distribution.node.defaultChild as cf.CfnDistribution
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', originAccessControl.attrId)

    // allow CloudFront to read from the website bucket 
    props.websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject", "s3:PutObject"],
      resources: [`${props.websiteBucket.bucketArn}/*`],
      principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
      conditions: {
        "StringEquals": {
          "aws:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`
        }
      }
    }));

    props.websiteKey.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,        
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ],
        resources: ["*"],
        conditions: {
          StringLike: {          
            "aws:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/*`,
          },
        },
      })
    );

    // ###################################################
    // Outputs
    // ###################################################
    new cdk.CfnOutput(this, "UserInterfaceDomainName", {
      value: `https://${distribution.distributionDomainName}`,
    });

    NagSuppressions.addResourceSuppressions(
      distributionLogsBucket,
      [
        {
          id: "AwsSolutions-S1",
          reason: "Bucket is the server access logs bucket for websiteBucket.",
        },
      ]
    );

    NagSuppressions.addResourceSuppressions(props.websiteBucket, [
      { id: "AwsSolutions-S5", reason: "OAI is configured for read." },
    ]);

    NagSuppressions.addResourceSuppressions(distribution, [
      { id: "AwsSolutions-CFR1", reason: "No geo restrictions" },
      {
        id: "AwsSolutions-CFR2",
        reason: "WAF not required due to configured Cognito auth.",
      },
      { id: "AwsSolutions-CFR4", reason: "TLS 1.2 is the default." },
    ]);
  }

}
