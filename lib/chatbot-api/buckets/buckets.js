"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3BucketStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
class S3BucketStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create a new S3 bucket
        this.kendraBucket = new s3.Bucket(scope, 'KendraSourceBucket', {
            // bucketName: 'kendra-s3-source',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicPolicy: false,
                blockPublicAcls: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            })
        });
        // Add the policy allowing public read access to the Kendra bucket
        this.kendraBucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()], // Allow access to anyone
            actions: ['s3:GetObject'],
            resources: [`${this.kendraBucket.bucketArn}/*`] // Apply to all objects in the bucket
        }));
        this.feedbackBucket = new s3.Bucket(scope, 'FeedbackDownloadBucket', {
            // bucketName: 'feedback-download',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
    }
}
exports.S3BucketStack = S3BucketStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVja2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1Y2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHlDQUF5QztBQUN6QywyQ0FBMkM7QUFHM0MsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFO1lBQzdELGtDQUFrQztZQUNsQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDakcsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCLENBQUM7WUFDRixpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDMUMsaUJBQWlCLEVBQUUsS0FBSztnQkFDeEIsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7YUFDN0IsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILGtFQUFrRTtRQUNsRSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM1RCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLFVBQVUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUseUJBQXlCO1lBQy9ELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQztZQUN6QixTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxxQ0FBcUM7U0FDdEYsQ0FBQyxDQUFDLENBQUE7UUFFSCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7WUFDbkUsbUNBQW1DO1lBQ25DLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLElBQUksRUFBRSxDQUFDO29CQUNMLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO29CQUNqRyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDdEIsQ0FBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlDRCxzQ0E4Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmV4cG9ydCBjbGFzcyBTM0J1Y2tldFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGtlbmRyYUJ1Y2tldDogczMuQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkgZmVlZGJhY2tCdWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgUzMgYnVja2V0XG4gICAgdGhpcy5rZW5kcmFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHNjb3BlLCAnS2VuZHJhU291cmNlQnVja2V0Jywge1xuICAgICAgLy8gYnVja2V0TmFtZTogJ2tlbmRyYS1zMy1zb3VyY2UnLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgY29yczogW3tcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsczMuSHR0cE1ldGhvZHMuUE9TVCxzMy5IdHRwTWV0aG9kcy5QVVQsczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCAgICAgIFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXVxuICAgICAgfV0sXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogbmV3IHMzLkJsb2NrUHVibGljQWNjZXNzKHtcbiAgICAgICAgYmxvY2tQdWJsaWNQb2xpY3k6IGZhbHNlLFxuICAgICAgICBibG9ja1B1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICBpZ25vcmVQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgcmVzdHJpY3RQdWJsaWNCdWNrZXRzOiBmYWxzZSxcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIHBvbGljeSBhbGxvd2luZyBwdWJsaWMgcmVhZCBhY2Nlc3MgdG8gdGhlIEtlbmRyYSBidWNrZXRcbiAgICB0aGlzLmtlbmRyYUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSwgLy8gQWxsb3cgYWNjZXNzIHRvIGFueW9uZVxuICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgIHJlc291cmNlczogW2Ake3RoaXMua2VuZHJhQnVja2V0LmJ1Y2tldEFybn0vKmBdIC8vIEFwcGx5IHRvIGFsbCBvYmplY3RzIGluIHRoZSBidWNrZXRcbiAgICB9KSkgICBcblxuICAgIHRoaXMuZmVlZGJhY2tCdWNrZXQgPSBuZXcgczMuQnVja2V0KHNjb3BlLCAnRmVlZGJhY2tEb3dubG9hZEJ1Y2tldCcsIHtcbiAgICAgIC8vIGJ1Y2tldE5hbWU6ICdmZWVkYmFjay1kb3dubG9hZCcsXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBjb3JzOiBbe1xuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIFxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSAgICAgXG4gICAgICB9XVxuICAgIH0pO1xuICB9XG59XG4iXX0=