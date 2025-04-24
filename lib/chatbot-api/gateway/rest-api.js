"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestBackendAPI = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class RestBackendAPI extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const httpApi = new aws_cdk_lib_1.aws_apigatewayv2.HttpApi(this, 'HTTP-API', {
            corsPreflight: {
                allowHeaders: ['*'],
                allowMethods: [
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.GET,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.HEAD,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.OPTIONS,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.POST,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.DELETE,
                ],
                allowOrigins: ['*'],
                maxAge: aws_cdk_lib_1.Duration.days(10),
            },
        });
        this.restAPI = httpApi;
        /*const appSyncLambdaResolver = new lambda.Function(
          this,
          "GraphQLApiHandler",
          {
            code: props.shared.sharedCode.bundleWithLambdaAsset(
              path.join(__dirname, "./functions/api-handler")
            ),
            handler: "index.handler",
            runtime: props.shared.pythonRuntime,
            architecture: props.shared.lambdaArchitecture,
            timeout: cdk.Duration.minutes(10),
            memorySize: 512,
            tracing: lambda.Tracing.ACTIVE,
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
            },
          }
        );
    
        function addPermissions(apiHandler: lambda.Function) {
          if (props.ragEngines?.workspacesTable) {
            props.ragEngines.workspacesTable.grantReadWriteData(apiHandler);
          }
    
          if (props.ragEngines?.documentsTable) {
            props.ragEngines.documentsTable.grantReadWriteData(apiHandler);
            props.ragEngines?.dataImport.rssIngestorFunction?.grantInvoke(
              apiHandler
            );
          }
    
          if (props.ragEngines?.auroraPgVector) {
            props.ragEngines.auroraPgVector.database.secret?.grantRead(apiHandler);
            props.ragEngines.auroraPgVector.database.connections.allowDefaultPortFrom(
              apiHandler
            );
    
            props.ragEngines.auroraPgVector.createAuroraWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.openSearchVector) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["aoss:APIAccessAll"],
                resources: [
                  props.ragEngines?.openSearchVector.openSearchCollection.attrArn,
                ],
              })
            );
    
            props.ragEngines.openSearchVector.createOpenSearchWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.kendraRetrieval) {
            props.ragEngines.kendraRetrieval.createKendraWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
    
            props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(
              apiHandler
            );
    
            if (props.ragEngines.kendraRetrieval.kendraIndex) {
              apiHandler.addToRolePolicy(
                new iam.PolicyStatement({
                  actions: [
                    "kendra:Retrieve",
                    "kendra:Query",
                    "kendra:BatchDeleteDocument",
                    "kendra:BatchPutDocument",
                    "kendra:StartDataSourceSyncJob",
                    "kendra:DescribeDataSourceSyncJob",
                    "kendra:StopDataSourceSyncJob",
                    "kendra:ListDataSourceSyncJobs",
                    "kendra:ListDataSources",
                    "kendra:DescribeIndex",
                  ],
                  resources: [
                    props.ragEngines.kendraRetrieval.kendraIndex.attrArn,
                    `${props.ragEngines.kendraRetrieval.kendraIndex.attrArn}/*`,
                  ],
                })
              );
            }
    
            for (const item of props.config.rag.engines.kendra.external ?? []) {
              if (item.roleArn) {
                apiHandler.addToRolePolicy(
                  new iam.PolicyStatement({
                    actions: ["sts:AssumeRole"],
                    resources: [item.roleArn],
                  })
                );
              } else {
                apiHandler.addToRolePolicy(
                  new iam.PolicyStatement({
                    actions: ["kendra:Retrieve", "kendra:Query"],
                    resources: [
                      `arn:${cdk.Aws.PARTITION}:kendra:${
                        item.region ?? cdk.Aws.REGION
                      }:${cdk.Aws.ACCOUNT_ID}:index/${item.kendraId}`,
                    ],
                  })
                );
              }
            }
          }
    
          if (props.ragEngines?.fileImportWorkflow) {
            props.ragEngines.fileImportWorkflow.grantStartExecution(apiHandler);
          }
    
          if (props.ragEngines?.websiteCrawlingWorkflow) {
            props.ragEngines.websiteCrawlingWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.deleteWorkspaceWorkflow) {
            props.ragEngines.deleteWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.sageMakerRagModels) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["sagemaker:InvokeEndpoint"],
                resources: [props.ragEngines.sageMakerRagModels.model.endpoint.ref],
              })
            );
          }
    
          for (const model of props.models) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["sagemaker:InvokeEndpoint"],
                resources: [model.endpoint.ref],
              })
            );
          }
    
          apiHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: [
                "comprehend:DetectDominantLanguage",
                "comprehend:DetectSentiment",
              ],
              resources: ["*"],
            })
          );
    
          props.shared.xOriginVerifySecret.grantRead(apiHandler);
          props.shared.apiKeysSecret.grantRead(apiHandler);
          props.shared.configParameter.grantRead(apiHandler);
          props.modelsParameter.grantRead(apiHandler);
          props.sessionsTable.grantReadWriteData(apiHandler);
          props.userFeedbackBucket.grantReadWrite(apiHandler);
          props.ragEngines?.uploadBucket.grantReadWrite(apiHandler);
          props.ragEngines?.processingBucket.grantReadWrite(apiHandler);
    
          if (props.config.bedrock?.enabled) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: [
                  "bedrock:ListFoundationModels",
                  "bedrock:ListCustomModels",
                  "bedrock:InvokeModel",
                  "bedrock:InvokeModelWithResponseStream",
                ],
                resources: ["*"],
              })
            );
    
            if (props.config.bedrock?.roleArn) {
              apiHandler.addToRolePolicy(
                new iam.PolicyStatement({
                  actions: ["sts:AssumeRole"],
                  resources: [props.config.bedrock.roleArn],
                })
              );
            }
          }
        }
    
        addPermissions(appSyncLambdaResolver);*/
    }
}
exports.RestBackendAPI = RestBackendAPI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdC1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXN0LWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwyQ0FBdUM7QUFDdkMsNkNBQW9FO0FBbUJwRSxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUUzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSw4QkFBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3BELGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLFlBQVksRUFBRTtvQkFDWiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUMxQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPO29CQUM5Qiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNO2lCQUM5QjtnQkFDRCxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDMUI7U0FDRixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2dEQTZMd0M7SUFFMUMsQ0FBQztDQUNGO0FBcE5ELHdDQW9OQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcblxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IER1cmF0aW9uLCBhd3NfYXBpZ2F0ZXdheXYyIGFzIGFwaWd3djIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcblxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcbmltcG9ydCAqIGFzIGVjMiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zc21cIjtcbi8vIGltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi9zaGFyZWRcIjtcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1hcHBzeW5jXCI7XG4vLyBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJncmFwaHFsXCI7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZXN0QmFja2VuZEFQSVByb3BzIHtcblxufVxuXG5leHBvcnQgY2xhc3MgUmVzdEJhY2tlbmRBUEkgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzdEFQSTogYXBpZ3d2Mi5IdHRwQXBpO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVzdEJhY2tlbmRBUElQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBodHRwQXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnSFRUUC1BUEknLCB7XG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93SGVhZGVyczogWycqJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuR0VULFxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuSEVBRCxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULFxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuREVMRVRFLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxuICAgICAgICBtYXhBZ2U6IER1cmF0aW9uLmRheXMoMTApLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICB0aGlzLnJlc3RBUEkgPSBodHRwQXBpO1xuICAgIC8qY29uc3QgYXBwU3luY0xhbWJkYVJlc29sdmVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIkdyYXBoUUxBcGlIYW5kbGVyXCIsXG4gICAgICB7XG4gICAgICAgIGNvZGU6IHByb3BzLnNoYXJlZC5zaGFyZWRDb2RlLmJ1bmRsZVdpdGhMYW1iZGFBc3NldChcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vZnVuY3Rpb25zL2FwaS1oYW5kbGVyXCIpXG4gICAgICAgICksXG4gICAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxuICAgICAgICBydW50aW1lOiBwcm9wcy5zaGFyZWQucHl0aG9uUnVudGltZSxcbiAgICAgICAgYXJjaGl0ZWN0dXJlOiBwcm9wcy5zaGFyZWQubGFtYmRhQXJjaGl0ZWN0dXJlLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxMCksXG4gICAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgICAgICAgIFxuICAgICAgICBlbnZpcm9ubWVudDogeyAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZnVuY3Rpb24gYWRkUGVybWlzc2lvbnMoYXBpSGFuZGxlcjogbGFtYmRhLkZ1bmN0aW9uKSB7XG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8ud29ya3NwYWNlc1RhYmxlKSB7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMud29ya3NwYWNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlIYW5kbGVyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/LmRvY3VtZW50c1RhYmxlKSB7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuZG9jdW1lbnRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUhhbmRsZXIpO1xuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzPy5kYXRhSW1wb3J0LnJzc0luZ2VzdG9yRnVuY3Rpb24/LmdyYW50SW52b2tlKFxuICAgICAgICAgIGFwaUhhbmRsZXJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/LmF1cm9yYVBnVmVjdG9yKSB7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuYXVyb3JhUGdWZWN0b3IuZGF0YWJhc2Uuc2VjcmV0Py5ncmFudFJlYWQoYXBpSGFuZGxlcik7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuYXVyb3JhUGdWZWN0b3IuZGF0YWJhc2UuY29ubmVjdGlvbnMuYWxsb3dEZWZhdWx0UG9ydEZyb20oXG4gICAgICAgICAgYXBpSGFuZGxlclxuICAgICAgICApO1xuXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuYXVyb3JhUGdWZWN0b3IuY3JlYXRlQXVyb3JhV29ya3NwYWNlV29ya2Zsb3cuZ3JhbnRTdGFydEV4ZWN1dGlvbihcbiAgICAgICAgICBhcGlIYW5kbGVyXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9wcy5yYWdFbmdpbmVzPy5vcGVuU2VhcmNoVmVjdG9yKSB7XG4gICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcImFvc3M6QVBJQWNjZXNzQWxsXCJdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgIHByb3BzLnJhZ0VuZ2luZXM/Lm9wZW5TZWFyY2hWZWN0b3Iub3BlblNlYXJjaENvbGxlY3Rpb24uYXR0ckFybixcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLm9wZW5TZWFyY2hWZWN0b3IuY3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZVdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oXG4gICAgICAgICAgYXBpSGFuZGxlclxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8ua2VuZHJhUmV0cmlldmFsKSB7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMua2VuZHJhUmV0cmlldmFsLmNyZWF0ZUtlbmRyYVdvcmtzcGFjZVdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oXG4gICAgICAgICAgYXBpSGFuZGxlclxuICAgICAgICApO1xuXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXM/LmtlbmRyYVJldHJpZXZhbD8ua2VuZHJhUzNEYXRhU291cmNlQnVja2V0Py5ncmFudFJlYWRXcml0ZShcbiAgICAgICAgICBhcGlIYW5kbGVyXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXMua2VuZHJhUmV0cmlldmFsLmtlbmRyYUluZGV4KSB7XG4gICAgICAgICAgYXBpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpSZXRyaWV2ZVwiLFxuICAgICAgICAgICAgICAgIFwia2VuZHJhOlF1ZXJ5XCIsXG4gICAgICAgICAgICAgICAgXCJrZW5kcmE6QmF0Y2hEZWxldGVEb2N1bWVudFwiLFxuICAgICAgICAgICAgICAgIFwia2VuZHJhOkJhdGNoUHV0RG9jdW1lbnRcIixcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpTdGFydERhdGFTb3VyY2VTeW5jSm9iXCIsXG4gICAgICAgICAgICAgICAgXCJrZW5kcmE6RGVzY3JpYmVEYXRhU291cmNlU3luY0pvYlwiLFxuICAgICAgICAgICAgICAgIFwia2VuZHJhOlN0b3BEYXRhU291cmNlU3luY0pvYlwiLFxuICAgICAgICAgICAgICAgIFwia2VuZHJhOkxpc3REYXRhU291cmNlU3luY0pvYnNcIixcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpMaXN0RGF0YVNvdXJjZXNcIixcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpEZXNjcmliZUluZGV4XCIsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIHByb3BzLnJhZ0VuZ2luZXMua2VuZHJhUmV0cmlldmFsLmtlbmRyYUluZGV4LmF0dHJBcm4sXG4gICAgICAgICAgICAgICAgYCR7cHJvcHMucmFnRW5naW5lcy5rZW5kcmFSZXRyaWV2YWwua2VuZHJhSW5kZXguYXR0ckFybn0vKmAsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5leHRlcm5hbCA/PyBbXSkge1xuICAgICAgICAgIGlmIChpdGVtLnJvbGVBcm4pIHtcbiAgICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1wic3RzOkFzc3VtZVJvbGVcIl0sXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbaXRlbS5yb2xlQXJuXSxcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1wia2VuZHJhOlJldHJpZXZlXCIsIFwia2VuZHJhOlF1ZXJ5XCJdLFxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgICAgYGFybjoke2Nkay5Bd3MuUEFSVElUSU9OfTprZW5kcmE6JHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5yZWdpb24gPz8gY2RrLkF3cy5SRUdJT05cbiAgICAgICAgICAgICAgICAgIH06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmluZGV4LyR7aXRlbS5rZW5kcmFJZH1gLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8uZmlsZUltcG9ydFdvcmtmbG93KSB7XG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuZmlsZUltcG9ydFdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oYXBpSGFuZGxlcik7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9wcy5yYWdFbmdpbmVzPy53ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdykge1xuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLndlYnNpdGVDcmF3bGluZ1dvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oXG4gICAgICAgICAgYXBpSGFuZGxlclxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8uZGVsZXRlV29ya3NwYWNlV29ya2Zsb3cpIHtcbiAgICAgICAgcHJvcHMucmFnRW5naW5lcy5kZWxldGVXb3Jrc3BhY2VXb3JrZmxvdy5ncmFudFN0YXJ0RXhlY3V0aW9uKFxuICAgICAgICAgIGFwaUhhbmRsZXJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/LnNhZ2VNYWtlclJhZ01vZGVscykge1xuICAgICAgICBhcGlIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJzYWdlbWFrZXI6SW52b2tlRW5kcG9pbnRcIl0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtwcm9wcy5yYWdFbmdpbmVzLnNhZ2VNYWtlclJhZ01vZGVscy5tb2RlbC5lbmRwb2ludC5yZWZdLFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbW9kZWwgb2YgcHJvcHMubW9kZWxzKSB7XG4gICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcInNhZ2VtYWtlcjpJbnZva2VFbmRwb2ludFwiXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW21vZGVsLmVuZHBvaW50LnJlZl0sXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgYXBpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICBcImNvbXByZWhlbmQ6RGV0ZWN0RG9taW5hbnRMYW5ndWFnZVwiLFxuICAgICAgICAgICAgXCJjb21wcmVoZW5kOkRldGVjdFNlbnRpbWVudFwiLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgcHJvcHMuc2hhcmVkLnhPcmlnaW5WZXJpZnlTZWNyZXQuZ3JhbnRSZWFkKGFwaUhhbmRsZXIpO1xuICAgICAgcHJvcHMuc2hhcmVkLmFwaUtleXNTZWNyZXQuZ3JhbnRSZWFkKGFwaUhhbmRsZXIpO1xuICAgICAgcHJvcHMuc2hhcmVkLmNvbmZpZ1BhcmFtZXRlci5ncmFudFJlYWQoYXBpSGFuZGxlcik7XG4gICAgICBwcm9wcy5tb2RlbHNQYXJhbWV0ZXIuZ3JhbnRSZWFkKGFwaUhhbmRsZXIpO1xuICAgICAgcHJvcHMuc2Vzc2lvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYXBpSGFuZGxlcik7XG4gICAgICBwcm9wcy51c2VyRmVlZGJhY2tCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoYXBpSGFuZGxlcik7XG4gICAgICBwcm9wcy5yYWdFbmdpbmVzPy51cGxvYWRCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoYXBpSGFuZGxlcik7XG4gICAgICBwcm9wcy5yYWdFbmdpbmVzPy5wcm9jZXNzaW5nQnVja2V0LmdyYW50UmVhZFdyaXRlKGFwaUhhbmRsZXIpO1xuXG4gICAgICBpZiAocHJvcHMuY29uZmlnLmJlZHJvY2s/LmVuYWJsZWQpIHtcbiAgICAgICAgYXBpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICBcImJlZHJvY2s6TGlzdEZvdW5kYXRpb25Nb2RlbHNcIixcbiAgICAgICAgICAgICAgXCJiZWRyb2NrOkxpc3RDdXN0b21Nb2RlbHNcIixcbiAgICAgICAgICAgICAgXCJiZWRyb2NrOkludm9rZU1vZGVsXCIsXG4gICAgICAgICAgICAgIFwiYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbVwiLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChwcm9wcy5jb25maWcuYmVkcm9jaz8ucm9sZUFybikge1xuICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJzdHM6QXNzdW1lUm9sZVwiXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuY29uZmlnLmJlZHJvY2sucm9sZUFybl0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBhZGRQZXJtaXNzaW9ucyhhcHBTeW5jTGFtYmRhUmVzb2x2ZXIpOyovXG5cbiAgfVxufVxuIl19