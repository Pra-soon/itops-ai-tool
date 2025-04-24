"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotApi = void 0;
const cdk = require("aws-cdk-lib");
const websocket_api_1 = require("./gateway/websocket-api");
const rest_api_1 = require("./gateway/rest-api");
const functions_1 = require("./functions/functions");
const tables_1 = require("./tables/tables");
const kendra_1 = require("./kendra/kendra");
const buckets_1 = require("./buckets/buckets");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_integrations_2 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_authorizers_1 = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
class ChatBotApi extends constructs_1.Construct {
    // public readonly byUserIdIndex: string;
    // public readonly filesBucket: s3.Bucket;
    // public readonly userFeedbackBucket: s3.Bucket;
    // public readonly wsAPI: apigwv2.WebSocketApi;
    constructor(scope, id, props) {
        super(scope, id);
        const tables = new tables_1.TableStack(this, "TableStack");
        const buckets = new buckets_1.S3BucketStack(this, "BucketStack");
        const kendra = new kendra_1.KendraIndexStack(this, "KendraStack", { s3Bucket: buckets.kendraBucket });
        const restBackend = new rest_api_1.RestBackendAPI(this, "RestBackend", {});
        this.httpAPI = restBackend;
        const websocketBackend = new websocket_api_1.WebsocketBackendAPI(this, "WebsocketBackend", {});
        this.wsAPI = websocketBackend;
        const lambdaFunctions = new functions_1.LambdaFunctionStack(this, "LambdaFunctions", {
            wsApiEndpoint: websocketBackend.wsAPIStage.url,
            sessionTable: tables.historyTable,
            kendraIndex: kendra.kendraIndex,
            kendraSource: kendra.kendraSource,
            feedbackTable: tables.feedbackTable,
            feedbackBucket: buckets.feedbackBucket,
            knowledgeBucket: buckets.kendraBucket,
        });
        const wsAuthorizer = new aws_apigatewayv2_authorizers_1.WebSocketLambdaAuthorizer('WebSocketAuthorizer', props.authentication.lambdaAuthorizer, { identitySource: ['route.request.querystring.Authorization'] });
        websocketBackend.wsAPI.addRoute('getChatbotResponse', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotResponseIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$connect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$default', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$disconnect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotDisconnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('generateEmail', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('emailIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.grantManageConnections(lambdaFunctions.chatFunction);
        const httpAuthorizer = new aws_apigatewayv2_authorizers_1.HttpJwtAuthorizer('HTTPAuthorizer', props.authentication.userPool.userPoolProviderUrl, {
            jwtAudience: [props.authentication.userPoolClient.userPoolClientId],
        });
        const sessionAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('SessionAPIIntegration', lambdaFunctions.sessionFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-session",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: sessionAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kpiAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KPIAPIIntegration', lambdaFunctions.kpiFunction);
        console.log('we made it as far as being about to add routes for kpi api');
        restBackend.restAPI.addRoutes({
            path: "/chatbot-use",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: kpiAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // SESSION_HANDLER
        // lambdaFunctions.chatFunction.addEnvironment(
        //   "mvp_user_session_handler_api_gateway_endpoint", restBackend.restAPI.apiEndpoint + "/user-session")
        lambdaFunctions.chatFunction.addEnvironment("SESSION_HANDLER", lambdaFunctions.sessionFunction.functionName);
        const feedbackAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: feedbackAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const feedbackAPIDownloadIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackDownloadAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback/download-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: feedbackAPIDownloadIntegration,
            authorizer: httpAuthorizer,
        });
        const s3GetAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetAPIIntegration', lambdaFunctions.getS3Function);
        restBackend.restAPI.addRoutes({
            path: "/s3-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3DeleteAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3DeleteAPIIntegration', lambdaFunctions.deleteS3Function);
        restBackend.restAPI.addRoutes({
            path: "/delete-s3-file",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3DeleteAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadAPIIntegration', lambdaFunctions.uploadS3Function);
        restBackend.restAPI.addRoutes({
            path: "/signed-url",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kendraSyncProgressAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
        restBackend.restAPI.addRoutes({
            path: "/kendra-sync/still-syncing",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kendraSyncProgressAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kendraSyncAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
        restBackend.restAPI.addRoutes({
            path: "/kendra-sync/sync-kendra",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kendraSyncAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const chatInvocationsCounterAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('ChatInvocationsCounterAPIIntegration', lambdaFunctions.chatInvocationsCounterFunction);
        restBackend.restAPI.addRoutes({
            path: "/chat-invocations-count",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: chatInvocationsCounterAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const comprehendMedicalAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('ComprehendMedicalAPIIntegration', lambdaFunctions.comprehendMedicalFunction);
        restBackend.restAPI.addRoutes({
            path: "/comprehend-medical-redact",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: comprehendMedicalAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // this.wsAPI = websocketBackend.wsAPI;
        // const api = new appsync.GraphqlApi(this, "ChatbotApi", {
        //   name: "ChatbotGraphqlApi",
        //   definition: appsync.Definition.fromFile(
        //     path.join(__dirname, "schema/schema.graphql")
        //   ),
        //   authorizationConfig: {
        //     additionalAuthorizationModes: [
        //       {
        //         authorizationType: appsync.AuthorizationType.IAM,
        //       },
        //       {
        //         authorizationType: appsync.AuthorizationType.USER_POOL,
        //         userPoolConfig: {
        //           userPool: props.userPool,
        //         },
        //       },
        //     ],
        //   },
        //   logConfig: {
        //     fieldLogLevel: appsync.FieldLogLevel.ALL,
        //     retention: RetentionDays.ONE_WEEK,
        //     role: loggingRole,
        //   },
        //   xrayEnabled: true,
        //   visibility: props.config.privateWebsite ? appsync.Visibility.PRIVATE : appsync.Visibility.GLOBAL
        // });
        // new ApiResolvers(this, "RestApi", {
        //   ...props,
        //   sessionsTable: chatTables.sessionsTable,
        //   byUserIdIndex: chatTables.byUserIdIndex,
        //   api,
        //   userFeedbackBucket: chatBuckets.userFeedbackBucket,
        // });
        // const realtimeBackend = new RealtimeGraphqlApiBackend(this, "Realtime", {
        //   ...props,
        //   api,
        // });
        // realtimeBackend.resolvers.outgoingMessageHandler.addEnvironment(
        //   "GRAPHQL_ENDPOINT",
        //   api.graphqlUrl
        // );
        // api.grantMutation(realtimeBackend.resolvers.outgoingMessageHandler);
        // // Prints out URL
        // new cdk.CfnOutput(this, "GraphqlAPIURL", {
        //   value: api.graphqlUrl,
        // });
        // // Prints out the AppSync GraphQL API key to the terminal
        new cdk.CfnOutput(this, "WS-API - apiEndpoint", {
            value: websocketBackend.wsAPI.apiEndpoint || "",
        });
        new cdk.CfnOutput(this, "HTTP-API - apiEndpoint", {
            value: restBackend.restAPI.apiEndpoint || "",
        });
        // this.messagesTopic = realtimeBackend.messagesTopic;
        // this.sessionsTable = chatTables.sessionsTable;
        // this.byUserIdIndex = chatTables.byUserIdIndex;
        // this.userFeedbackBucket = chatBuckets.userFeedbackBucket;
        // this.filesBucket = chatBuckets.filesBucket;
        // this.graphqlApi = api;
        /**
         * CDK NAG suppression
         */
        // NagSuppressions.addResourceSuppressions(loggingRole, [
        //   {
        //     id: "AwsSolutions-IAM5",
        //     reason:
        //       "Access to all log groups required for CloudWatch log group creation.",
        //   },
        // ]);
    }
}
exports.ChatBotApi = ChatBotApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQSxtQ0FBbUM7QUFLbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCwrQ0FBaUQ7QUFFakQsNkZBQXVGO0FBQ3ZGLDZGQUFrRjtBQUNsRiwyRkFBaUk7QUFDakksNkNBQTBEO0FBQzFELDJDQUF1QztBQVF2QyxNQUFhLFVBQVcsU0FBUSxzQkFBUztJQUd2Qyx5Q0FBeUM7SUFDekMsMENBQTBDO0lBQzFDLGlEQUFpRDtJQUNqRCwrQ0FBK0M7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sTUFBTSxHQUFHLElBQUksbUJBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLHlCQUFnQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFN0YsTUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBYyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFDM0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG1DQUFtQixDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO1FBRTlCLE1BQU0sZUFBZSxHQUFHLElBQUksK0JBQW1CLENBQUMsSUFB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SUFDUixDQUFDO0NBQ0Y7QUFuUEQsZ0NBbVBDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCAqIGFzIHNucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNuc1wiO1xuaW1wb3J0ICogYXMgc3NtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3NtXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuaW1wb3J0IHsgQXV0aG9yaXphdGlvblN0YWNrIH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbidcblxuaW1wb3J0IHsgV2Vic29ja2V0QmFja2VuZEFQSSB9IGZyb20gXCIuL2dhdGV3YXkvd2Vic29ja2V0LWFwaVwiXG5pbXBvcnQgeyBSZXN0QmFja2VuZEFQSSB9IGZyb20gXCIuL2dhdGV3YXkvcmVzdC1hcGlcIlxuaW1wb3J0IHsgTGFtYmRhRnVuY3Rpb25TdGFjayB9IGZyb20gXCIuL2Z1bmN0aW9ucy9mdW5jdGlvbnNcIlxuaW1wb3J0IHsgVGFibGVTdGFjayB9IGZyb20gXCIuL3RhYmxlcy90YWJsZXNcIlxuaW1wb3J0IHsgS2VuZHJhSW5kZXhTdGFjayB9IGZyb20gXCIuL2tlbmRyYS9rZW5kcmFcIlxuaW1wb3J0IHsgUzNCdWNrZXRTdGFjayB9IGZyb20gXCIuL2J1Y2tldHMvYnVja2V0c1wiXG5cbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0IHsgV2ViU29ja2V0TGFtYmRhQXV0aG9yaXplciwgSHR0cFVzZXJQb29sQXV0aG9yaXplciwgSHR0cEp3dEF1dGhvcml6ZXIgIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XG5pbXBvcnQgeyBhd3NfYXBpZ2F0ZXdheXYyIGFzIGFwaWd3djIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbi8vIGltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhdEJvdEFwaVByb3BzIHtcbiAgcmVhZG9ubHkgYXV0aGVudGljYXRpb246IEF1dGhvcml6YXRpb25TdGFjazsgXG59XG5cbmV4cG9ydCBjbGFzcyBDaGF0Qm90QXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGh0dHBBUEk6IFJlc3RCYWNrZW5kQVBJO1xuICBwdWJsaWMgcmVhZG9ubHkgd3NBUEk6IFdlYnNvY2tldEJhY2tlbmRBUEk7XG4gIC8vIHB1YmxpYyByZWFkb25seSBieVVzZXJJZEluZGV4OiBzdHJpbmc7XG4gIC8vIHB1YmxpYyByZWFkb25seSBmaWxlc0J1Y2tldDogczMuQnVja2V0O1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgdXNlckZlZWRiYWNrQnVja2V0OiBzMy5CdWNrZXQ7XG4gIC8vIHB1YmxpYyByZWFkb25seSB3c0FQSTogYXBpZ3d2Mi5XZWJTb2NrZXRBcGk7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENoYXRCb3RBcGlQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB0YWJsZXMgPSBuZXcgVGFibGVTdGFjayh0aGlzLCBcIlRhYmxlU3RhY2tcIik7XG4gICAgY29uc3QgYnVja2V0cyA9IG5ldyBTM0J1Y2tldFN0YWNrKHRoaXMsIFwiQnVja2V0U3RhY2tcIik7XG4gICAgY29uc3Qga2VuZHJhID0gbmV3IEtlbmRyYUluZGV4U3RhY2sodGhpcywgXCJLZW5kcmFTdGFja1wiLCB7IHMzQnVja2V0OiBidWNrZXRzLmtlbmRyYUJ1Y2tldCB9KTtcblxuICAgIGNvbnN0IHJlc3RCYWNrZW5kID0gbmV3IFJlc3RCYWNrZW5kQVBJKHRoaXMsIFwiUmVzdEJhY2tlbmRcIiwge30pXG4gICAgdGhpcy5odHRwQVBJID0gcmVzdEJhY2tlbmQ7XG4gICAgY29uc3Qgd2Vic29ja2V0QmFja2VuZCA9IG5ldyBXZWJzb2NrZXRCYWNrZW5kQVBJKHRoaXMsIFwiV2Vic29ja2V0QmFja2VuZFwiLCB7fSlcbiAgICB0aGlzLndzQVBJID0gd2Vic29ja2V0QmFja2VuZDtcblxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9ucyA9IG5ldyBMYW1iZGFGdW5jdGlvblN0YWNrKHRoaXMsIFwiTGFtYmRhRnVuY3Rpb25zXCIsXG4gICAgICB7XG4gICAgICAgIHdzQXBpRW5kcG9pbnQ6IHdlYnNvY2tldEJhY2tlbmQud3NBUElTdGFnZS51cmwsXG4gICAgICAgIHNlc3Npb25UYWJsZTogdGFibGVzLmhpc3RvcnlUYWJsZSxcbiAgICAgICAga2VuZHJhSW5kZXg6IGtlbmRyYS5rZW5kcmFJbmRleCxcbiAgICAgICAga2VuZHJhU291cmNlOiBrZW5kcmEua2VuZHJhU291cmNlLFxuICAgICAgICBmZWVkYmFja1RhYmxlOiB0YWJsZXMuZmVlZGJhY2tUYWJsZSxcbiAgICAgICAgZmVlZGJhY2tCdWNrZXQ6IGJ1Y2tldHMuZmVlZGJhY2tCdWNrZXQsXG4gICAgICAgIGtub3dsZWRnZUJ1Y2tldDogYnVja2V0cy5rZW5kcmFCdWNrZXQsXG5cbiAgICAgIH0pXG5cbiAgICBjb25zdCB3c0F1dGhvcml6ZXIgPSBuZXcgV2ViU29ja2V0TGFtYmRhQXV0aG9yaXplcignV2ViU29ja2V0QXV0aG9yaXplcicsIHByb3BzLmF1dGhlbnRpY2F0aW9uLmxhbWJkYUF1dGhvcml6ZXIsIHtpZGVudGl0eVNvdXJjZTogWydyb3V0ZS5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLkF1dGhvcml6YXRpb24nXX0pO1xuXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnZ2V0Q2hhdGJvdFJlc3BvbnNlJywge1xuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdFJlc3BvbnNlSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxuICAgIH0pO1xuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRjb25uZWN0Jywge1xuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdENvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxuICAgICAgYXV0aG9yaXplcjogd3NBdXRob3JpemVyXG4gICAgfSk7XG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGRlZmF1bHQnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90Q29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckZGlzY29ubmVjdCcsIHtcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3REaXNjb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxuICAgIH0pO1xuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJ2dlbmVyYXRlRW1haWwnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdlbWFpbEludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTtcblxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuZ3JhbnRNYW5hZ2VDb25uZWN0aW9ucyhsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKTtcblxuICAgIFxuICAgIGNvbnN0IGh0dHBBdXRob3JpemVyID0gbmV3IEh0dHBKd3RBdXRob3JpemVyKCdIVFRQQXV0aG9yaXplcicsIHByb3BzLmF1dGhlbnRpY2F0aW9uLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJVcmwse1xuICAgICAgand0QXVkaWVuY2U6IFtwcm9wcy5hdXRoZW50aWNhdGlvbi51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXSxcbiAgICB9KVxuXG4gICAgY29uc3Qgc2Vzc2lvbkFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignU2Vzc2lvbkFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnNlc3Npb25GdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIvdXNlci1zZXNzaW9uXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgaW50ZWdyYXRpb246IHNlc3Npb25BUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBrcGlBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tQSUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmtwaUZ1bmN0aW9uKTtcbiAgICBjb25zb2xlLmxvZygnd2UgbWFkZSBpdCBhcyBmYXIgYXMgYmVpbmcgYWJvdXQgdG8gYWRkIHJvdXRlcyBmb3Iga3BpIGFwaScpO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2NoYXRib3QtdXNlXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgaW50ZWdyYXRpb246IGtwaUFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFNFU1NJT05fSEFORExFUlxuICAgIC8vIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXG4gICAgLy8gICBcIm12cF91c2VyX3Nlc3Npb25faGFuZGxlcl9hcGlfZ2F0ZXdheV9lbmRwb2ludFwiLCByZXN0QmFja2VuZC5yZXN0QVBJLmFwaUVuZHBvaW50ICsgXCIvdXNlci1zZXNzaW9uXCIpXG4gICAgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudChcbiAgICAgIFwiU0VTU0lPTl9IQU5ETEVSXCIsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24uZnVuY3Rpb25OYW1lKVxuICAgIFxuXG4gICAgY29uc3QgZmVlZGJhY2tBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZlZWRiYWNrQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZmVlZGJhY2tGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIvdXNlci1mZWVkYmFja1wiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcbiAgICAgIGludGVncmF0aW9uOiBmZWVkYmFja0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IGZlZWRiYWNrQVBJRG93bmxvYWRJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZlZWRiYWNrRG93bmxvYWRBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5mZWVkYmFja0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi91c2VyLWZlZWRiYWNrL2Rvd25sb2FkLWZlZWRiYWNrXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJRG93bmxvYWRJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBzM0dldEFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNHZXRBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5nZXRTM0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9zMy1idWNrZXQtZGF0YVwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBzM0dldEFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHMzRGVsZXRlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0RlbGV0ZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmRlbGV0ZVMzRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2RlbGV0ZS1zMy1maWxlXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IHMzRGVsZXRlQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3QgczNVcGxvYWRBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzVXBsb2FkQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMudXBsb2FkUzNGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIvc2lnbmVkLXVybFwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBzM1VwbG9hZEFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IGtlbmRyYVN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS2VuZHJhU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIva2VuZHJhLXN5bmMvc3RpbGwtc3luY2luZ1wiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGtlbmRyYVN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IGtlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zeW5jS2VuZHJhRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2tlbmRyYS1zeW5jL3N5bmMta2VuZHJhXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY0FQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICBjb25zdCBjaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdDaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9jaGF0LWludm9jYXRpb25zLWNvdW50XCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogY2hhdEludm9jYXRpb25zQ291bnRlckFQSUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuXG4gICAgY29uc3QgY29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NvbXByZWhlbmRNZWRpY2FsQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIvY29tcHJlaGVuZC1tZWRpY2FsLXJlZGFjdFwiLCBcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogY29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cblxuICAgICAgLy8gdGhpcy53c0FQSSA9IHdlYnNvY2tldEJhY2tlbmQud3NBUEk7XG5cblxuXG5cbiAgICAvLyBjb25zdCBhcGkgPSBuZXcgYXBwc3luYy5HcmFwaHFsQXBpKHRoaXMsIFwiQ2hhdGJvdEFwaVwiLCB7XG4gICAgLy8gICBuYW1lOiBcIkNoYXRib3RHcmFwaHFsQXBpXCIsXG4gICAgLy8gICBkZWZpbml0aW9uOiBhcHBzeW5jLkRlZmluaXRpb24uZnJvbUZpbGUoXG4gICAgLy8gICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwic2NoZW1hL3NjaGVtYS5ncmFwaHFsXCIpXG4gICAgLy8gICApLFxuICAgIC8vICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgIC8vICAgICBhZGRpdGlvbmFsQXV0aG9yaXphdGlvbk1vZGVzOiBbXG4gICAgLy8gICAgICAge1xuICAgIC8vICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuSUFNLFxuICAgIC8vICAgICAgIH0sXG4gICAgLy8gICAgICAge1xuICAgIC8vICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgIC8vICAgICAgICAgdXNlclBvb2xDb25maWc6IHtcbiAgICAvLyAgICAgICAgICAgdXNlclBvb2w6IHByb3BzLnVzZXJQb29sLFxuICAgIC8vICAgICAgICAgfSxcbiAgICAvLyAgICAgICB9LFxuICAgIC8vICAgICBdLFxuICAgIC8vICAgfSxcbiAgICAvLyAgIGxvZ0NvbmZpZzoge1xuICAgIC8vICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxuICAgIC8vICAgICByZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgLy8gICAgIHJvbGU6IGxvZ2dpbmdSb2xlLFxuICAgIC8vICAgfSxcbiAgICAvLyAgIHhyYXlFbmFibGVkOiB0cnVlLFxuICAgIC8vICAgdmlzaWJpbGl0eTogcHJvcHMuY29uZmlnLnByaXZhdGVXZWJzaXRlID8gYXBwc3luYy5WaXNpYmlsaXR5LlBSSVZBVEUgOiBhcHBzeW5jLlZpc2liaWxpdHkuR0xPQkFMXG4gICAgLy8gfSk7XG5cbiAgICAvLyBuZXcgQXBpUmVzb2x2ZXJzKHRoaXMsIFwiUmVzdEFwaVwiLCB7XG4gICAgLy8gICAuLi5wcm9wcyxcbiAgICAvLyAgIHNlc3Npb25zVGFibGU6IGNoYXRUYWJsZXMuc2Vzc2lvbnNUYWJsZSxcbiAgICAvLyAgIGJ5VXNlcklkSW5kZXg6IGNoYXRUYWJsZXMuYnlVc2VySWRJbmRleCxcbiAgICAvLyAgIGFwaSxcbiAgICAvLyAgIHVzZXJGZWVkYmFja0J1Y2tldDogY2hhdEJ1Y2tldHMudXNlckZlZWRiYWNrQnVja2V0LFxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgcmVhbHRpbWVCYWNrZW5kID0gbmV3IFJlYWx0aW1lR3JhcGhxbEFwaUJhY2tlbmQodGhpcywgXCJSZWFsdGltZVwiLCB7XG4gICAgLy8gICAuLi5wcm9wcyxcbiAgICAvLyAgIGFwaSxcbiAgICAvLyB9KTtcblxuICAgIC8vIHJlYWx0aW1lQmFja2VuZC5yZXNvbHZlcnMub3V0Z29pbmdNZXNzYWdlSGFuZGxlci5hZGRFbnZpcm9ubWVudChcbiAgICAvLyAgIFwiR1JBUEhRTF9FTkRQT0lOVFwiLFxuICAgIC8vICAgYXBpLmdyYXBocWxVcmxcbiAgICAvLyApO1xuXG4gICAgLy8gYXBpLmdyYW50TXV0YXRpb24ocmVhbHRpbWVCYWNrZW5kLnJlc29sdmVycy5vdXRnb2luZ01lc3NhZ2VIYW5kbGVyKTtcblxuICAgIC8vIC8vIFByaW50cyBvdXQgVVJMXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJHcmFwaHFsQVBJVVJMXCIsIHtcbiAgICAvLyAgIHZhbHVlOiBhcGkuZ3JhcGhxbFVybCxcbiAgICAvLyB9KTtcblxuICAgIC8vIC8vIFByaW50cyBvdXQgdGhlIEFwcFN5bmMgR3JhcGhRTCBBUEkga2V5IHRvIHRoZSB0ZXJtaW5hbFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiV1MtQVBJIC0gYXBpRW5kcG9pbnRcIiwge1xuICAgICAgdmFsdWU6IHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYXBpRW5kcG9pbnQgfHwgXCJcIixcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkhUVFAtQVBJIC0gYXBpRW5kcG9pbnRcIiwge1xuICAgICAgdmFsdWU6IHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgfHwgXCJcIixcbiAgICB9KTtcblxuICAgIC8vIHRoaXMubWVzc2FnZXNUb3BpYyA9IHJlYWx0aW1lQmFja2VuZC5tZXNzYWdlc1RvcGljO1xuICAgIC8vIHRoaXMuc2Vzc2lvbnNUYWJsZSA9IGNoYXRUYWJsZXMuc2Vzc2lvbnNUYWJsZTtcbiAgICAvLyB0aGlzLmJ5VXNlcklkSW5kZXggPSBjaGF0VGFibGVzLmJ5VXNlcklkSW5kZXg7XG4gICAgLy8gdGhpcy51c2VyRmVlZGJhY2tCdWNrZXQgPSBjaGF0QnVja2V0cy51c2VyRmVlZGJhY2tCdWNrZXQ7XG4gICAgLy8gdGhpcy5maWxlc0J1Y2tldCA9IGNoYXRCdWNrZXRzLmZpbGVzQnVja2V0O1xuICAgIC8vIHRoaXMuZ3JhcGhxbEFwaSA9IGFwaTtcblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICAvLyBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMobG9nZ2luZ1JvbGUsIFtcbiAgICAvLyAgIHtcbiAgICAvLyAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAvLyAgICAgcmVhc29uOlxuICAgIC8vICAgICAgIFwiQWNjZXNzIHRvIGFsbCBsb2cgZ3JvdXBzIHJlcXVpcmVkIGZvciBDbG91ZFdhdGNoIGxvZyBncm91cCBjcmVhdGlvbi5cIixcbiAgICAvLyAgIH0sXG4gICAgLy8gXSk7XG4gIH1cbn1cbiJdfQ==