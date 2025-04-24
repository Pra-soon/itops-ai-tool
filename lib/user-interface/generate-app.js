"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Website = void 0;
const cdk = require("aws-cdk-lib");
const cf = require("aws-cdk-lib/aws-cloudfront");
const s3 = require("aws-cdk-lib/aws-s3");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class Website extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /////////////////////////////////////
        ///// CLOUDFRONT IMPLEMENTATION /////
        /////////////////////////////////////
        const originAccessIdentity = new cf.OriginAccessIdentity(this, "S3OAI");
        props.websiteBucket.grantRead(originAccessIdentity);
        const distributionLogsBucket = new s3.Bucket(this, "DistributionLogsBucket", {
            objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const distribution = new cf.CloudFrontWebDistribution(this, "Distribution", {
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
            loggingConfig: {
                bucket: distributionLogsBucket,
            },
            originConfigs: [
                {
                    behaviors: [{ isDefaultBehavior: true }],
                    s3OriginSource: {
                        s3BucketSource: props.websiteBucket,
                        originAccessIdentity,
                    },
                },
                {
                    behaviors: [
                        {
                            pathPattern: "/chatbot/files/*",
                            allowedMethods: cf.CloudFrontAllowedMethods.ALL,
                            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                            defaultTtl: cdk.Duration.seconds(0),
                            forwardedValues: {
                                queryString: true,
                                headers: [
                                    "Referer",
                                    "Origin",
                                    "Authorization",
                                    "Content-Type",
                                    "x-forwarded-user",
                                    "Access-Control-Request-Headers",
                                    "Access-Control-Request-Method",
                                ],
                            },
                        },
                    ],
                    s3OriginSource: {
                        s3BucketSource: props.websiteBucket,
                        originAccessIdentity,
                    },
                },
            ],
            // geoRestriction: cfGeoRestrictEnable ? cf.GeoRestriction.allowlist(...cfGeoRestrictList): undefined,
            errorConfigurations: [
                {
                    errorCode: 404,
                    errorCachingMinTtl: 0,
                    responseCode: 200,
                    responsePagePath: "/index.html",
                },
            ],
        });
        this.distribution = distribution;
        // ###################################################
        // Outputs
        // ###################################################
        new cdk.CfnOutput(this, "UserInterfaceDomainName", {
            value: `https://${distribution.distributionDomainName}`,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distributionLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(props.websiteBucket, [
            { id: "AwsSolutions-S5", reason: "OAI is configured for read." },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distribution, [
            { id: "AwsSolutions-CFR1", reason: "No geo restrictions" },
            {
                id: "AwsSolutions-CFR2",
                reason: "WAF not required due to configured Cognito auth.",
            },
            { id: "AwsSolutions-CFR4", reason: "TLS 1.2 is the default." },
        ]);
    }
}
exports.Website = Website;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGUtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseUNBQXlDO0FBRXpDLDJDQUF1QztBQUV2QyxxQ0FBMEM7QUFVMUMsTUFBYSxPQUFRLFNBQVEsc0JBQVM7SUFHcEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQjtRQUMzRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFDckMscUNBQXFDO1FBRXJDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hFLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFHcEQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQzFDLElBQUksRUFDSix3QkFBd0IsRUFDeEI7WUFDRSxlQUFlLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxhQUFhO1lBQ2pELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUNGLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FDbkQsSUFBSSxFQUNKLGNBQWMsRUFDZDtZQUNFLG1DQUFtQztZQUNuQyxZQUFZO1lBQ1osaUdBQWlHO1lBQ2pHLCtCQUErQjtZQUMvQix5R0FBeUc7WUFDekcsa0NBQWtDO1lBQ2xDLGtOQUFrTjtZQUNsTiwyREFBMkQ7WUFDM0QsZ0VBQWdFO1lBQ2hFLDBGQUEwRjtZQUMxRixRQUFRO1lBQ1IsdUNBQXVDO1lBQ3ZDLFNBQVM7WUFDVCxNQUFNO1lBQ04sb0JBQW9CLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtZQUMvRCxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlO1lBQ3pDLFdBQVcsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVc7WUFDdkMsYUFBYSxFQUFFO2dCQUNiLE1BQU0sRUFBRSxzQkFBc0I7YUFDL0I7WUFDRCxhQUFhLEVBQUU7Z0JBQ2I7b0JBQ0UsU0FBUyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFDeEMsY0FBYyxFQUFFO3dCQUNkLGNBQWMsRUFBRSxLQUFLLENBQUMsYUFBYTt3QkFDbkMsb0JBQW9CO3FCQUNyQjtpQkFDRjtnQkFDRDtvQkFDRSxTQUFTLEVBQUU7d0JBQ1Q7NEJBQ0UsV0FBVyxFQUFFLGtCQUFrQjs0QkFDL0IsY0FBYyxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHOzRCQUMvQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCOzRCQUMvRCxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOzRCQUNuQyxlQUFlLEVBQUU7Z0NBQ2YsV0FBVyxFQUFFLElBQUk7Z0NBQ2pCLE9BQU8sRUFBRTtvQ0FDUCxTQUFTO29DQUNULFFBQVE7b0NBQ1IsZUFBZTtvQ0FDZixjQUFjO29DQUNkLGtCQUFrQjtvQ0FDbEIsZ0NBQWdDO29DQUNoQywrQkFBK0I7aUNBQ2hDOzZCQUNGO3lCQUNGO3FCQUNGO29CQUNELGNBQWMsRUFBRTt3QkFDZCxjQUFjLEVBQUUsS0FBSyxDQUFDLGFBQWE7d0JBQ25DLG9CQUFvQjtxQkFDckI7aUJBQ0Y7YUFDRjtZQUVELHNHQUFzRztZQUN0RyxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsU0FBUyxFQUFFLEdBQUc7b0JBQ2Qsa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsWUFBWSxFQUFFLEdBQUc7b0JBQ2pCLGdCQUFnQixFQUFFLGFBQWE7aUJBQ2hDO2FBQ0Y7U0FDRixDQUNGLENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUVqQyxzREFBc0Q7UUFDdEQsVUFBVTtRQUNWLHNEQUFzRDtRQUN0RCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxXQUFXLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtTQUN4RCxDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxzQkFBc0IsRUFDdEI7WUFDRTtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQUUsNERBQTREO2FBQ3JFO1NBQ0YsQ0FDRixDQUFDO1FBRUYseUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFO1lBQzNELEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSw2QkFBNkIsRUFBRTtTQUNqRSxDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRTtZQUNwRCxFQUFFLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7WUFDMUQ7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLGtEQUFrRDthQUMzRDtZQUNELEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBRTtTQUMvRCxDQUFDLENBQUM7SUFDSCxDQUFDO0NBRUY7QUFuSUgsMEJBbUlHIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgY2YgZnJvbSBcImF3cy1jZGstbGliL2F3cy1jbG91ZGZyb250XCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4uL2NoYXRib3QtYXBpXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Vic2l0ZVByb3BzIHsgIFxuICByZWFkb25seSB1c2VyUG9vbElkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcbiAgcmVhZG9ubHkgYXBpOiBDaGF0Qm90QXBpO1xuICByZWFkb25seSB3ZWJzaXRlQnVja2V0OiBzMy5CdWNrZXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBXZWJzaXRlIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgICByZWFkb25seSBkaXN0cmlidXRpb246IGNmLkNsb3VkRnJvbnRXZWJEaXN0cmlidXRpb247XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFdlYnNpdGVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8vLy8gQ0xPVURGUk9OVCBJTVBMRU1FTlRBVElPTiAvLy8vL1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNmLk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsIFwiUzNPQUlcIik7XG4gICAgcHJvcHMud2Vic2l0ZUJ1Y2tldC5ncmFudFJlYWQob3JpZ2luQWNjZXNzSWRlbnRpdHkpOyAgICBcblxuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uTG9nc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQoXG4gICAgICB0aGlzLFxuICAgICAgXCJEaXN0cmlidXRpb25Mb2dzQnVja2V0XCIsXG4gICAgICB7XG4gICAgICAgIG9iamVjdE93bmVyc2hpcDogczMuT2JqZWN0T3duZXJzaGlwLk9CSkVDVF9XUklURVIsXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2YuQ2xvdWRGcm9udFdlYkRpc3RyaWJ1dGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIkRpc3RyaWJ1dGlvblwiLFxuICAgICAge1xuICAgICAgICAvLyBDVVNUT00gRE9NQUlOIEZPUiBQVUJMSUMgV0VCU0lURVxuICAgICAgICAvLyBSRVFVSVJFUzpcbiAgICAgICAgLy8gMS4gQUNNIENlcnRpZmljYXRlIEFSTiBpbiB1cy1lYXN0LTEgYW5kIERvbWFpbiBvZiB3ZWJzaXRlIHRvIGJlIGlucHV0IGR1cmluZyAnbnBtIHJ1biBjb25maWcnOlxuICAgICAgICAvLyAgICBcInByaXZhdGVXZWJzaXRlXCIgOiBmYWxzZSxcbiAgICAgICAgLy8gICAgXCJjZXJ0aWZpY2F0ZVwiIDogXCJhcm46YXdzOmFjbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDpjZXJ0aWZpY2F0ZS9YWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFwiLFxuICAgICAgICAvLyAgICBcImRvbWFpblwiIDogXCJzdWIuZXhhbXBsZS5jb21cIlxuICAgICAgICAvLyAyLiBBZnRlciB0aGUgZGVwbG95bWVudCwgaW4geW91ciBSb3V0ZTUzIEhvc3RlZCBab25lLCBhZGQgYW4gXCJBIFJlY29yZFwiIHRoYXQgcG9pbnRzIHRvIHRoZSBDbG91ZGZyb250IEFsaWFzIChodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vUm91dGU1My9sYXRlc3QvRGV2ZWxvcGVyR3VpZGUvcm91dGluZy10by1jbG91ZGZyb250LWRpc3RyaWJ1dGlvbi5odG1sKVxuICAgICAgICAvLyAuLi4ocHJvcHMuY29uZmlnLmNlcnRpZmljYXRlICYmIHByb3BzLmNvbmZpZy5kb21haW4gJiYge1xuICAgICAgICAvLyAgIHZpZXdlckNlcnRpZmljYXRlOiBjZi5WaWV3ZXJDZXJ0aWZpY2F0ZS5mcm9tQWNtQ2VydGlmaWNhdGUoXG4gICAgICAgIC8vICAgICBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsJ0Nsb3VkZnJvbnRBY20nLCBwcm9wcy5jb25maWcuY2VydGlmaWNhdGUpLFxuICAgICAgICAvLyAgICAge1xuICAgICAgICAvLyAgICAgICBhbGlhc2VzOiBbcHJvcHMuY29uZmlnLmRvbWFpbl1cbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2YuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIHByaWNlQ2xhc3M6IGNmLlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfQUxMLFxuICAgICAgICBodHRwVmVyc2lvbjogY2YuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXG4gICAgICAgIGxvZ2dpbmdDb25maWc6IHtcbiAgICAgICAgICBidWNrZXQ6IGRpc3RyaWJ1dGlvbkxvZ3NCdWNrZXQsXG4gICAgICAgIH0sXG4gICAgICAgIG9yaWdpbkNvbmZpZ3M6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBiZWhhdmlvcnM6IFt7IGlzRGVmYXVsdEJlaGF2aW9yOiB0cnVlIH1dLFxuICAgICAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcbiAgICAgICAgICAgICAgczNCdWNrZXRTb3VyY2U6IHByb3BzLndlYnNpdGVCdWNrZXQsXG4gICAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJlaGF2aW9yczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcGF0aFBhdHRlcm46IFwiL2NoYXRib3QvZmlsZXMvKlwiLFxuICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjZi5DbG91ZEZyb250QWxsb3dlZE1ldGhvZHMuQUxMLFxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjZi5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgICAgICAgICBmb3J3YXJkZWRWYWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVyczogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlZmVyZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJPcmlnaW5cIixcbiAgICAgICAgICAgICAgICAgICAgXCJBdXRob3JpemF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwieC1mb3J3YXJkZWQtdXNlclwiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLVJlcXVlc3QtSGVhZGVyc1wiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLVJlcXVlc3QtTWV0aG9kXCIsXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcbiAgICAgICAgICAgICAgczNCdWNrZXRTb3VyY2U6IHByb3BzLndlYnNpdGVCdWNrZXQsXG4gICAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICAgICAgfSwgICAgICAgICAgICBcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBcbiAgICAgICAgLy8gZ2VvUmVzdHJpY3Rpb246IGNmR2VvUmVzdHJpY3RFbmFibGUgPyBjZi5HZW9SZXN0cmljdGlvbi5hbGxvd2xpc3QoLi4uY2ZHZW9SZXN0cmljdExpc3QpOiB1bmRlZmluZWQsXG4gICAgICAgIGVycm9yQ29uZmlndXJhdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBlcnJvckNvZGU6IDQwNCxcbiAgICAgICAgICAgIGVycm9yQ2FjaGluZ01pblR0bDogMCxcbiAgICAgICAgICAgIHJlc3BvbnNlQ29kZTogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogXCIvaW5kZXguaHRtbFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMuZGlzdHJpYnV0aW9uID0gZGlzdHJpYnV0aW9uO1xuXG4gICAgLy8gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgLy8gT3V0cHV0c1xuICAgIC8vICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlckludGVyZmFjZURvbWFpbk5hbWVcIiwge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICB9KTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGRpc3RyaWJ1dGlvbkxvZ3NCdWNrZXQsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcbiAgICAgICAgICByZWFzb246IFwiQnVja2V0IGlzIHRoZSBzZXJ2ZXIgYWNjZXNzIGxvZ3MgYnVja2V0IGZvciB3ZWJzaXRlQnVja2V0LlwiLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMocHJvcHMud2Vic2l0ZUJ1Y2tldCwgW1xuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtUzVcIiwgcmVhc29uOiBcIk9BSSBpcyBjb25maWd1cmVkIGZvciByZWFkLlwiIH0sXG4gICAgXSk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoZGlzdHJpYnV0aW9uLCBbXG4gICAgICB7IGlkOiBcIkF3c1NvbHV0aW9ucy1DRlIxXCIsIHJlYXNvbjogXCJObyBnZW8gcmVzdHJpY3Rpb25zXCIgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUNGUjJcIixcbiAgICAgICAgcmVhc29uOiBcIldBRiBub3QgcmVxdWlyZWQgZHVlIHRvIGNvbmZpZ3VyZWQgQ29nbml0byBhdXRoLlwiLFxuICAgICAgfSxcbiAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLUNGUjRcIiwgcmVhc29uOiBcIlRMUyAxLjIgaXMgdGhlIGRlZmF1bHQuXCIgfSxcbiAgICBdKTtcbiAgICB9XG5cbiAgfVxuIl19