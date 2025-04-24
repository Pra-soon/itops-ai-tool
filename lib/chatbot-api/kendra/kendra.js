"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KendraIndexStack = void 0;
const cdk = require("aws-cdk-lib");
const kendra = require("aws-cdk-lib/aws-kendra");
const iam = require("aws-cdk-lib/aws-iam");
const constants_1 = require("../../constants");
class KendraIndexStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        const kendraIndexRole = new iam.Role(scope, 'KendraIndexRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${props.s3Bucket.bucketName}`,
                `arn:aws:s3:::${props.s3Bucket.bucketName}/*`,
            ],
        }));
        // Add the CloudWatch permissions
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'cloudwatch:namespace': 'AWS/Kendra',
                },
            },
        }));
        // Add the CloudWatch Logs permissions
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:DescribeLogGroups'],
            resources: ['*'],
        }));
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:CreateLogGroup'],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kendra/*`],
        }));
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:DescribeLogStreams', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kendra/*:log-stream:*`],
        }));
        // Create a new Kendra index
        const index = new kendra.CfnIndex(scope, 'KendraIndex', {
            name: constants_1.kendraIndexName,
            roleArn: kendraIndexRole.roleArn,
            description: 'Gen AI Chatbot Kendra Index',
            edition: 'DEVELOPER_EDITION',
        });
        const kendraDataSourceRole = new iam.Role(scope, 'KendraDataSourceRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });
        kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${props.s3Bucket.bucketName}`,
                `arn:aws:s3:::${props.s3Bucket.bucketName}/*`,
            ],
        }));
        kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
            actions: ["kendra:BatchPutDocument", "kendra:BatchDeleteDocument"],
            resources: [
                index.attrArn
            ],
        }));
        // Use the provided S3 bucket for the data source and FAQ
        const dataSource = new kendra.CfnDataSource(scope, 'KendraS3DataSource', {
            indexId: index.attrId,
            name: 's3-source',
            type: 'S3',
            roleArn: kendraDataSourceRole.roleArn,
            dataSourceConfiguration: {
                s3Configuration: {
                    bucketName: props.s3Bucket.bucketName,
                },
            }
        });
        dataSource.addDependency(index);
        this.kendraIndex = index;
        this.kendraSource = dataSource;
    }
}
exports.KendraIndexStack = KendraIndexStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2VuZHJhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsia2VuZHJhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFFakQsMkNBQTJDO0FBRTNDLCtDQUFpRDtBQU1qRCxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBRzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFO1lBQzdELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztTQUM1RCxDQUFDLENBQUM7UUFFSCxlQUFlLENBQUMsV0FBVyxDQUN6QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztZQUMxQyxTQUFTLEVBQUU7Z0JBQ1QsZ0JBQWdCLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUMzQyxnQkFBZ0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLElBQUk7YUFDOUM7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUdGLGlDQUFpQztRQUNqQyxlQUFlLENBQUMsV0FBVyxDQUN6QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQztZQUNyQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDaEIsVUFBVSxFQUFFO2dCQUNWLFlBQVksRUFBRTtvQkFDWixzQkFBc0IsRUFBRSxZQUFZO2lCQUNyQzthQUNGO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRixzQ0FBc0M7UUFDdEMs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OlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGtlbmRyYSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta2VuZHJhJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsga2VuZHJhSW5kZXhOYW1lIH0gZnJvbSBcIi4uLy4uL2NvbnN0YW50c1wiXG5cbmV4cG9ydCBpbnRlcmZhY2UgS2VuZHJhSW5kZXhTdGFja1Byb3BzIHtcbiAgczNCdWNrZXQ6IHMzLkJ1Y2tldFxufVxuXG5leHBvcnQgY2xhc3MgS2VuZHJhSW5kZXhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBrZW5kcmFJbmRleCA6IGtlbmRyYS5DZm5JbmRleDtcbiAgcHVibGljIHJlYWRvbmx5IGtlbmRyYVNvdXJjZSA6IGtlbmRyYS5DZm5EYXRhU291cmNlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogS2VuZHJhSW5kZXhTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGtlbmRyYUluZGV4Um9sZSA9IG5ldyBpYW0uUm9sZShzY29wZSwgJ0tlbmRyYUluZGV4Um9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdrZW5kcmEuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAga2VuZHJhSW5kZXhSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCcsICdzMzpMaXN0QnVja2V0J10sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHtwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lfWAsXG4gICAgICAgICAgYGFybjphd3M6czM6Ojoke3Byb3BzLnMzQnVja2V0LmJ1Y2tldE5hbWV9LypgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG5cbiAgICAvLyBBZGQgdGhlIENsb3VkV2F0Y2ggcGVybWlzc2lvbnNcbiAgICBrZW5kcmFJbmRleFJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogWydjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgJ2Nsb3Vkd2F0Y2g6bmFtZXNwYWNlJzogJ0FXUy9LZW5kcmEnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBBZGQgdGhlIENsb3VkV2F0Y2ggTG9ncyBwZXJtaXNzaW9uc1xuICAgIGtlbmRyYUluZGV4Um9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGtlbmRyYUluZGV4Um9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6bG9nczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bG9nLWdyb3VwOi9hd3Mva2VuZHJhLypgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGtlbmRyYUluZGV4Um9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJywgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJywgJ2xvZ3M6UHV0TG9nRXZlbnRzJ10sXG4gICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmxvZ3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmxvZy1ncm91cDovYXdzL2tlbmRyYS8qOmxvZy1zdHJlYW06KmBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IEtlbmRyYSBpbmRleFxuICAgIGNvbnN0IGluZGV4ID0gbmV3IGtlbmRyYS5DZm5JbmRleChzY29wZSwgJ0tlbmRyYUluZGV4Jywge1xuICAgICAgbmFtZToga2VuZHJhSW5kZXhOYW1lLFxuICAgICAgcm9sZUFybjoga2VuZHJhSW5kZXhSb2xlLnJvbGVBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0dlbiBBSSBDaGF0Ym90IEtlbmRyYSBJbmRleCcsXG4gICAgICBlZGl0aW9uOiAnREVWRUxPUEVSX0VESVRJT04nLFxuICAgIH0pO1xuXG5cbiAgICBjb25zdCBrZW5kcmFEYXRhU291cmNlUm9sZSA9IG5ldyBpYW0uUm9sZShzY29wZSwgJ0tlbmRyYURhdGFTb3VyY2VSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2tlbmRyYS5hbWF6b25hd3MuY29tJyksXG4gICAgfSk7XG5cbiAgICBrZW5kcmFEYXRhU291cmNlUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnLCAnczM6TGlzdEJ1Y2tldCddLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7cHJvcHMuczNCdWNrZXQuYnVja2V0TmFtZX1gLFxuICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHtwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lfS8qYCxcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGtlbmRyYURhdGFTb3VyY2VSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXCJrZW5kcmE6QmF0Y2hQdXREb2N1bWVudFwiLCBcImtlbmRyYTpCYXRjaERlbGV0ZURvY3VtZW50XCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBpbmRleC5hdHRyQXJuXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cblxuICAgIC8vIFVzZSB0aGUgcHJvdmlkZWQgUzMgYnVja2V0IGZvciB0aGUgZGF0YSBzb3VyY2UgYW5kIEZBUVxuICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBuZXcga2VuZHJhLkNmbkRhdGFTb3VyY2Uoc2NvcGUsICdLZW5kcmFTM0RhdGFTb3VyY2UnLCB7XG4gICAgICBpbmRleElkOiBpbmRleC5hdHRySWQsXG4gICAgICBuYW1lOiAnczMtc291cmNlJyxcbiAgICAgIHR5cGU6ICdTMycsXG4gICAgICByb2xlQXJuIDoga2VuZHJhRGF0YVNvdXJjZVJvbGUucm9sZUFybixcbiAgICAgIGRhdGFTb3VyY2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHMzQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGJ1Y2tldE5hbWU6IHByb3BzLnMzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfSk7XG4gICAgZGF0YVNvdXJjZS5hZGREZXBlbmRlbmN5KGluZGV4KTtcbiAgICB0aGlzLmtlbmRyYUluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5rZW5kcmFTb3VyY2UgPSBkYXRhU291cmNlO1xuICB9XG59XG4iXX0=