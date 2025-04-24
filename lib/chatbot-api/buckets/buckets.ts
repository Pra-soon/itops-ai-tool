import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from "constructs";

export class S3BucketStack extends cdk.Stack {
  public readonly kendraBucket: s3.Bucket;
  public readonly feedbackBucket: s3.Bucket;
  public readonly evalResultsBucket: s3.Bucket;
  public readonly evalTestCasesBucket: s3.Bucket;
  public readonly ragasDependenciesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cloudTrailBucket = new s3.Bucket(scope, 'CloudTrailBucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
      enforceSSL: true,
    });

    const cloudTrailKey = new kms.Key(scope, 'CloudTrailKey', {
      enableKeyRotation: true,    
      alias: cdk.Stack.of(this).stackName + 'CloudTrailKey',    
    });

    const dataEventTrailLogGroup = new logs.LogGroup(scope, 'DataEventTrailLogGroup', {
    });

    const dataEventTrail = new cloudtrail.Trail(scope, 'DataEventTrail', {
      encryptionKey: cloudTrailKey,
      bucket: cloudTrailBucket,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: dataEventTrailLogGroup,
    });    

    // Give Cloudtrail permissions to use KMS
    cloudTrailKey.grantEncryptDecrypt(new iam.ServicePrincipal('cloudtrail.amazonaws.com'));
    cloudTrailKey.grantEncrypt(new kms.ViaServicePrincipal('s3.amazonaws.com', new iam.AnyPrincipal()));


    // Create a new S3 bucket for logging
    const loggingBucket = new s3.Bucket(scope, "LoggingBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'], 
        allowedHeaders: ["*"]     
      }],
      enforceSSL: true,
    });
    
    loggingBucket.grantReadWrite(new iam.ServicePrincipal('logs.amazonaws.com'));    
    
    // Create a new S3 bucket
    this.kendraBucket = new s3.Bucket(scope, 'KendraSourceBucket', {
      // bucketName: 'kendra-s3-source',
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED, 
      serverAccessLogsBucket: loggingBucket,           
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'],      
        allowedHeaders: ["*"]
      }],  
      enforceSSL: true,    
    });
    // Create an S3 data source role for Kendra needed to configure 
    // the s3 data source on Kendra console after deployment.
    const kendraS3Role = new iam.Role(this, 'KendraS3DataSourceRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      description: 'IAM role for Kendra to access S3 bucket',
    });
    // Add Kendra-specific permissions for document operations
    kendraS3Role.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'kendra:BatchPutDocument',
            'kendra:BatchDeleteDocument'
        ],
        resources: [
            `arn:aws:kendra:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:index/*`
        ]
    }));
    // Add bucket policy to allow Kendra's IAM role to access S3 bucket created above
    this.kendraBucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: [
            's3:GetObject',
            's3:ListBucket'
        ],
        resources: [
            this.kendraBucket.arnForObjects('*'),
            this.kendraBucket.bucketArn
        ],
        principals: [new iam.ArnPrincipal(kendraS3Role.roleArn)]
    }));
    // Output the role name/ARN for easy reference in each stack deployment
    new cdk.CfnOutput(this, 'KendraS3RoleName', {
        value: kendraS3Role.roleName,
        description: `Kendra S3 data source role name for stack ${cdk.Stack.of(this).stackName}`
    });
    new cdk.CfnOutput(this, 'KendraS3RoleArn', {
        value: kendraS3Role.roleArn,
        description: `Kendra S3 data source role ARN for stack ${cdk.Stack.of(this).stackName}`
    });
      
    this.feedbackBucket = new s3.Bucket(scope, 'FeedbackDownloadBucket', {
      // bucketName: 'feedback-download',
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      serverAccessLogsBucket: loggingBucket,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'], 
        allowedHeaders: ["*"]     
      }],
      enforceSSL: true,
    });

    this.evalResultsBucket = new s3.Bucket(scope, 'EvalResultsBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      serverAccessLogsBucket: loggingBucket,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'], 
        allowedHeaders: ["*"]     
      }],     
      enforceSSL: true, 
    });

    this.evalTestCasesBucket = new s3.Bucket(scope, 'EvalTestCasesBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      serverAccessLogsBucket: loggingBucket,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'], 
        allowedHeaders: ["*"]     
      }],
      enforceSSL: true,
    });

    this.ragasDependenciesBucket = new s3.Bucket(scope, 'RagasDependenciesBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      serverAccessLogsBucket: loggingBucket,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET,s3.HttpMethods.POST,s3.HttpMethods.PUT,s3.HttpMethods.DELETE],
        allowedOrigins: ['*'], 
        allowedHeaders: ["*"]     
      }],
      enforceSSL: true,
    });
    
    // Add S3 event selectors to the CloudTrail        

    dataEventTrail.logAllS3DataEvents({includeManagementEvents: false});

    /*dataEventTrail.addS3EventSelector([{bucket: this.kendraBucket}],{includeManagementEvents: false});
    dataEventTrail.addS3EventSelector([{bucket: this.feedbackBucket}],{includeManagementEvents: false});
    dataEventTrail.addS3EventSelector([{bucket: this.evalResultsBucket}],{includeManagementEvents: false});
    dataEventTrail.addS3EventSelector([{bucket: this.evalTestCasesBucket}],{includeManagementEvents: false});
    dataEventTrail.addS3EventSelector([{bucket: this.ragasDependenciesBucket}],{includeManagementEvents: false});*/

  }
}
