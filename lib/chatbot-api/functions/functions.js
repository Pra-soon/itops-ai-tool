"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaFunctionStack = void 0;
const cdk = require("aws-cdk-lib");
const path = require("path");
// Import Lambda L2 construct
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
class LambdaFunctionStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        const sessionAPIHandlerFunction = new lambda.Function(scope, 'SessionHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'session-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "DDB_TABLE_NAME": props.sessionTable.tableName
            },
            timeout: cdk.Duration.seconds(30)
        });
        const kpiAPIHandlerFunction = new lambda.Function(scope, 'KPIHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'kpi-handler')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "INTERACTION_TABLE": props.interactionTable.tableName,
                "INTERACTION_S3_DOWNLOAD": props.interactionBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        kpiAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: ['arn:aws:dynamodb:us-east-1:807596108910:table/itops-chatbot-logs',
                'arn:aws:dynamodb:us-east-1:807596108910:table/itops-chatbot-logs' + "/index/*"]
        }));
        this.kpiFunction = kpiAPIHandlerFunction;
        sessionAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.sessionTable.tableArn, props.sessionTable.tableArn + "/index/*"]
        }));
        this.sessionFunction = sessionAPIHandlerFunction;
        // Define the Lambda function resource
        const websocketAPIFunction = new lambda.Function(scope, 'ChatHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-chat')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "mvp_websocket__api_endpoint_test": props.wsApiEndpoint.replace("wss", "https"),
                "INDEX_ID": props.kendraIndex.attrId
            },
            timeout: cdk.Duration.seconds(300)
        });
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel'
            ],
            resources: ["*"]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:Retrieve'
            ],
            resources: [props.kendraIndex.attrArn]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'lambda:InvokeFunction'
            ],
            resources: [this.sessionFunction.functionArn]
        }));
        this.chatFunction = websocketAPIFunction;
        const feedbackAPIHandlerFunction = new lambda.Function(scope, 'FeedbackHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'feedback-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "FEEDBACK_TABLE": props.feedbackTable.tableName,
                "FEEDBACK_S3_DOWNLOAD": props.feedbackBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.feedbackTable.tableArn, props.feedbackTable.tableArn + "/index/*"]
        }));
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.feedbackBucket.bucketArn, props.feedbackBucket.bucketArn + "/*"]
        }));
        this.feedbackFunction = feedbackAPIHandlerFunction;
        const deleteS3APIHandlerFunction = new lambda.Function(scope, 'DeleteS3FilesHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/delete-s3')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        deleteS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.deleteS3Function = deleteS3APIHandlerFunction;
        const getS3APIHandlerFunction = new lambda.Function(scope, 'GetS3FilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/get-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.getS3Function = getS3APIHandlerFunction;
        const kendraSyncAPIHandlerFunction = new lambda.Function(scope, 'SyncKendraHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/kendra-sync')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "KENDRA": props.kendraIndex.attrId,
                "SOURCE": props.kendraSource.attrId
            },
            timeout: cdk.Duration.seconds(30)
        });
        kendraSyncAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:*'
            ],
            resources: [props.kendraIndex.attrArn, props.kendraSource.attrArn]
        }));
        this.syncKendraFunction = kendraSyncAPIHandlerFunction;
        const uploadS3APIHandlerFunction = new lambda.Function(scope, 'UploadS3FilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/upload-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.uploadS3Function = uploadS3APIHandlerFunction;
        const chatInvocationsCounterFunction = new lambda.Function(scope, 'ChatInvocationsCounterFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'chat-invocations-counter')),
            handler: 'lambda_function.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            environment: {
                CHAT_FUNCTION_NAME: this.chatFunction.functionName,
            },
        });
        chatInvocationsCounterFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:GetMetricStatistics'],
            resources: ['*'],
        }));
        this.chatInvocationsCounterFunction = chatInvocationsCounterFunction;
        const comprehendMedicalFunction = new lambda.Function(scope, 'comprehendMedicalFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'comprehend-medical')),
            handler: 'lambda_function.lambda_handler',
            timeout: cdk.Duration.seconds(60),
        });
        this.comprehendMedicalFunction = comprehendMedicalFunction;
        comprehendMedicalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['comprehendmedical:DetectPHI', 'comprehendmedical:DetectEntitiesV2'],
            resources: ['*'], // Adjust if specific resources are used.
        }));
    }
}
exports.LambdaFunctionStack = LambdaFunctionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyw2QkFBNkI7QUFFN0IsNkJBQTZCO0FBQzdCLGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFrQjNDLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFhaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNyRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsaUNBQWlDO1lBQ3ZHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxxREFBcUQ7WUFDaEcsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUzthQUNoRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFO1lBQzdFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSx1Q0FBdUM7WUFDNUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLEVB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Q0FBQztRQUVuRCxNQUFNLHVCQUF1QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLEVBQUU7WUFDeEYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUN2RSxPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlCQUF5QixHQUFHLHlCQUF5QixDQUFDO1FBRTNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDaEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxvQ0FBb0MsQ0FBQztZQUM5RSxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSx5Q0FBeUM7U0FDNUQsQ0FBQyxDQUFDLENBQUM7SUFJTixDQUFDO0NBQ0Y7QUE1UEQsa0RBNFBDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW1wb3J0IExhbWJkYSBMMiBjb25zdHJ1Y3RcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGtlbmRyYSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta2VuZHJhJztcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xuXG5cbmludGVyZmFjZSBMYW1iZGFGdW5jdGlvblN0YWNrUHJvcHMgeyAgXG4gIHJlYWRvbmx5IHdzQXBpRW5kcG9pbnQgOiBzdHJpbmc7ICBcbiAgcmVhZG9ubHkgc2Vzc2lvblRhYmxlIDogVGFibGU7XG4gIHJlYWRvbmx5IGtlbmRyYUluZGV4IDoga2VuZHJhLkNmbkluZGV4O1xuICByZWFkb25seSBrZW5kcmFTb3VyY2UgOiBrZW5kcmEuQ2ZuRGF0YVNvdXJjZTtcbiAgcmVhZG9ubHkgZmVlZGJhY2tUYWJsZSA6IFRhYmxlO1xuICByZWFkb25seSBmZWVkYmFja0J1Y2tldCA6IHMzLkJ1Y2tldDtcbiAgcmVhZG9ubHkga25vd2xlZGdlQnVja2V0IDogczMuQnVja2V0O1xuICAvL3JlYWRvbmx5IGtwaVRhYmxlIDogVGFibGU7XG59XG5cbmV4cG9ydCBjbGFzcyBMYW1iZGFGdW5jdGlvblN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHsgIFxuICBwdWJsaWMgcmVhZG9ubHkgY2hhdEZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbkZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZmVlZGJhY2tGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGRlbGV0ZVMzRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBnZXRTM0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgdXBsb2FkUzNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IHN5bmNLZW5kcmFGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkga3BpRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG5cblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTsgICAgXG5cbiAgICBjb25zdCBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1Nlc3Npb25IYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Nlc3Npb24taGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiRERCX1RBQkxFX05BTUVcIiA6IHByb3BzLnNlc3Npb25UYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIGNvbnN0IGtwaUFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdLUElIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2twaS1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIC8vXCJEREJfVEFCTEVfTkFNRVwiIDogcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlTmFtZVxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAga3BpQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbJ2Fybjphd3M6ZHluYW1vZGI6dXMtZWFzdC0xOjgwNzU5NjEwODkxMDp0YWJsZS9tZWMtY2hhdGJvdC1sb2dzJyxcbiAgICAgICAgJ2Fybjphd3M6ZHluYW1vZGI6dXMtZWFzdC0xOjgwNzU5NjEwODkxMDp0YWJsZS9tZWMtY2hhdGJvdC1sb2dzJyArIFwiL2luZGV4LypcIl1cbiAgICB9KSk7XG5cbiAgICB0aGlzLmtwaUZ1bmN0aW9uID0ga3BpQVBJSGFuZGxlckZ1bmN0aW9uO1xuICAgIFxuICAgIHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAnZHluYW1vZGI6U2NhbidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5zZXNzaW9uVGFibGUudGFibGVBcm4sIHByb3BzLnNlc3Npb25UYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cbiAgICB9KSk7XG5cbiAgICB0aGlzLnNlc3Npb25GdW5jdGlvbiA9IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb247XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBMYW1iZGEgZnVuY3Rpb24gcmVzb3VyY2VcbiAgICAgICAgY29uc3Qgd2Vic29ja2V0QVBJRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnQ2hhdEhhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICd3ZWJzb2NrZXQtY2hhdCcpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgICAgIGVudmlyb25tZW50IDoge1xuICAgICAgICAgICAgXCJtdnBfd2Vic29ja2V0X19hcGlfZW5kcG9pbnRfdGVzdFwiIDogcHJvcHMud3NBcGlFbmRwb2ludC5yZXBsYWNlKFwid3NzXCIsXCJodHRwc1wiKSxcbiAgICAgICAgICAgIFwiSU5ERVhfSURcIiA6IHByb3BzLmtlbmRyYUluZGV4LmF0dHJJZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKVxuICAgICAgICB9KTtcbiAgICAgICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cbiAgICAgICAgfSkpO1xuICAgICAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAna2VuZHJhOlJldHJpZXZlJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybl1cbiAgICAgICAgfSkpO1xuXG4gICAgICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbkFybl1cbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGF0RnVuY3Rpb24gPSB3ZWJzb2NrZXRBUElGdW5jdGlvbjtcblxuICAgIGNvbnN0IGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0ZlZWRiYWNrSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdmZWVkYmFjay1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJGRUVEQkFDS19UQUJMRVwiIDogcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFwiRkVFREJBQ0tfUzNfRE9XTkxPQURcIiA6IHByb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcbiAgICBcbiAgICBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmZlZWRiYWNrVGFibGUudGFibGVBcm4sIHByb3BzLmZlZWRiYWNrVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCJdXG4gICAgfSkpO1xuXG4gICAgZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0QXJuLHByb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXG4gICAgfSkpO1xuXG4gICAgdGhpcy5mZWVkYmFja0Z1bmN0aW9uID0gZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb247XG4gICAgXG4gICAgY29uc3QgZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRGVsZXRlUzNGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna25vd2xlZGdlLW1hbmFnZW1lbnQvZGVsZXRlLXMzJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG5cbiAgICBkZWxldGVTM0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcbiAgICB0aGlzLmRlbGV0ZVMzRnVuY3Rpb24gPSBkZWxldGVTM0FQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IGdldFMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0dldFMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2dldC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIGdldFMzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4scHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXG4gICAgfSkpO1xuICAgIHRoaXMuZ2V0UzNGdW5jdGlvbiA9IGdldFMzQVBJSGFuZGxlckZ1bmN0aW9uO1xuXG5cbiAgICBjb25zdCBrZW5kcmFTeW5jQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1N5bmNLZW5kcmFIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2tlbmRyYS1zeW5jJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJLRU5EUkFcIiA6IHByb3BzLmtlbmRyYUluZGV4LmF0dHJJZCwgICAgICBcbiAgICAgICAgXCJTT1VSQ0VcIiA6IHByb3BzLmtlbmRyYVNvdXJjZS5hdHRySWQgIFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAna2VuZHJhOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybiwgcHJvcHMua2VuZHJhU291cmNlLmF0dHJBcm5dXG4gICAgfSkpO1xuICAgIHRoaXMuc3luY0tlbmRyYUZ1bmN0aW9uID0ga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IHVwbG9hZFMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1VwbG9hZFMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L3VwbG9hZC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIHVwbG9hZFMzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4scHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXG4gICAgfSkpO1xuICAgIHRoaXMudXBsb2FkUzNGdW5jdGlvbiA9IHVwbG9hZFMzQVBJSGFuZGxlckZ1bmN0aW9uO1xuXG4gICAgY29uc3QgY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0NoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdjaGF0LWludm9jYXRpb25zLWNvdW50ZXInKSksXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIENIQVRfRlVOQ1RJT05fTkFNRTogdGhpcy5jaGF0RnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxuICAgICAgfSwgICAgXG4gICAgfSk7XG5cbiAgICBjaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFsnY2xvdWR3YXRjaDpHZXRNZXRyaWNTdGF0aXN0aWNzJ10sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIHRoaXMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uID0gY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uO1xuXG4gICAgY29uc3QgY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NvbXByZWhlbmQtbWVkaWNhbCcpKSxcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAgIFxuICAgIH0pO1xuXG4gICAgdGhpcy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uID0gY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbjtcblxuICAgIGNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFsnY29tcHJlaGVuZG1lZGljYWw6RGV0ZWN0UEhJJywgJ2NvbXByZWhlbmRtZWRpY2FsOkRldGVjdEVudGl0aWVzVjInXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIEFkanVzdCBpZiBzcGVjaWZpYyByZXNvdXJjZXMgYXJlIHVzZWQuXG4gICAgfSkpO1xuICAgIFxuXG5cbiAgfVxufVxuIl19