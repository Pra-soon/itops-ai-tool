"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const constants_1 = require("../constants");
const aws_cognito_1 = require("aws-cdk-lib/aws-cognito");
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const path = __importStar(require("path"));
class AuthorizationStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Replace these values with your Azure client ID, client secret, and issuer URL
        // const azureClientId = 'your-azure-client-id';
        // const azureClientSecret = 'your-azure-client-secret';
        // const azureIssuerUrl = 'https://your-azure-issuer.com';
        // Create the Cognito User Pool
        const userPool = new aws_cognito_1.UserPool(this, 'UserPool', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled: false,
            mfa: cognito.Mfa.OPTIONAL,
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
            autoVerify: { email: true, phone: true },
            signInAliases: {
                email: true,
            },
            customAttributes: {
                'role': new cognito.StringAttribute({ minLen: 0, maxLen: 30, mutable: true })
            }
            // ... other user pool configurations
        });
        this.userPool = userPool;
        // Create a provider attribute for mapping Azure claims
        // const providerAttribute = new ProviderAttribute({
        //   name: 'custom_attr',
        //   type: 'String',
        // });
        userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: constants_1.cognitoDomainName,
            },
        });
        // Add the Azure OIDC identity provider to the User Pool
        // const azureProvider = new UserPoolIdentityProviderOidc(this, 'AzureProvider', {
        //   clientId: azureClientId,
        //   clientSecret: azureClientSecret,
        //   issuerUrl: azureIssuerUrl,
        //   userPool: userPool,
        //   attributeMapping: {
        //     // email: ProviderAttribute.fromString('email'),
        //     // fullname: ProviderAttribute.fromString('name'),
        //     // custom: {
        //     //   customKey: providerAttribute,
        //     // },
        //   },
        //   // ... other optional properties
        // });
        const userPoolClient = new aws_cognito_1.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            // supportedIdentityProviders: [UserPoolClientIdentityProvider.custom(azureProvider.providerName)],
        });
        this.userPoolClient = userPoolClient;
        const authorizerHandlerFunction = new lambda.Function(this, 'AuthorizationFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-api-authorizer'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ],
                },
            }),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "USER_POOL_ID": userPool.userPoolId,
                "APP_CLIENT_ID": userPoolClient.userPoolClientId
            },
            timeout: cdk.Duration.seconds(30)
        });
        this.lambdaAuthorizer = authorizerHandlerFunction;
        new cdk.CfnOutput(this, "UserPool ID", {
            value: userPool.userPoolId || "",
        });
        new cdk.CfnOutput(this, "UserPool Client ID", {
            value: userPoolClient.userPoolClientId || "",
        });
        // new cdk.CfnOutput(this, "UserPool Client Name", {
        //   value: userPoolClient.userPoolClientName || "",
        // });
    }
}
exports.AuthorizationStack = AuthorizationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsMkNBQXVDO0FBQ3ZDLDRDQUFnRDtBQUNoRCx5REFBbUo7QUFDbkosaUVBQW1EO0FBQ25ELCtEQUFpRDtBQUNqRCwyQ0FBNkI7QUFFN0IsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUsvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsZ0ZBQWdGO1FBQ2hGLGdEQUFnRDtRQUNoRCx3REFBd0Q7UUFDeEQsMERBQTBEO1FBRTFELCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUTtZQUN6QixvQkFBb0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDeEMsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxnQkFBZ0IsRUFBRztnQkFDakIsTUFBTSxFQUFHLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDL0U7WUFDRCxxQ0FBcUM7U0FDdEMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsdURBQXVEO1FBQ3ZELG9EQUFvRDtRQUNwRCx5QkFBeUI7UUFDekIsb0JBQW9CO1FBQ3BCLE1BQU07UUFDTixRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFLDZCQUFpQjthQUNoQztTQUNGLENBQUMsQ0FBQztRQUdILHdEQUF3RDtRQUN4RCxrRkFBa0Y7UUFDbEYsNkJBQTZCO1FBQzdCLHFDQUFxQztRQUNyQywrQkFBK0I7UUFDL0Isd0JBQXdCO1FBQ3hCLHdCQUF3QjtRQUN4Qix1REFBdUQ7UUFDdkQseURBQXlEO1FBQ3pELG1CQUFtQjtRQUNuQix5Q0FBeUM7UUFDekMsWUFBWTtRQUNaLE9BQU87UUFDUCxxQ0FBcUM7UUFDckMsTUFBTTtRQUVOLE1BQU0sY0FBYyxHQUFHLElBQUksNEJBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDaEUsUUFBUTtZQUNSLG1HQUFtRztTQUNwRyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUVyQyxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDbkYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsRUFBRTtnQkFDNUUsUUFBUSxFQUFFO29CQUNSLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxhQUFhO29CQUMvQyxPQUFPLEVBQUU7d0JBQ1AsTUFBTSxFQUFFLElBQUk7d0JBQ1osNEVBQTRFO3FCQUM3RTtpQkFDRjthQUNGLENBQUM7WUFDRixPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUcsUUFBUSxDQUFDLFVBQVU7Z0JBQ3BDLGVBQWUsRUFBRyxjQUFjLENBQUMsZ0JBQWdCO2FBQ2xEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFHSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcseUJBQXlCLENBQUM7UUFFbEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLElBQUksRUFBRTtTQUNqQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCLElBQUksRUFBRTtTQUM3QyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsb0RBQW9EO1FBQ3BELE1BQU07SUFJUixDQUFDO0NBQ0Y7QUF0R0QsZ0RBc0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IGNvZ25pdG9Eb21haW5OYW1lIH0gZnJvbSAnLi4vY29uc3RhbnRzJyBcclxuaW1wb3J0IHsgVXNlclBvb2wsIFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGMsVXNlclBvb2xDbGllbnQsIFVzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlciwgUHJvdmlkZXJBdHRyaWJ1dGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRob3JpemF0aW9uU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFBdXRob3JpemVyIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbCA6IFVzZXJQb29sO1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbENsaWVudCA6IFVzZXJQb29sQ2xpZW50O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIFJlcGxhY2UgdGhlc2UgdmFsdWVzIHdpdGggeW91ciBBenVyZSBjbGllbnQgSUQsIGNsaWVudCBzZWNyZXQsIGFuZCBpc3N1ZXIgVVJMXHJcbiAgICAvLyBjb25zdCBhenVyZUNsaWVudElkID0gJ3lvdXItYXp1cmUtY2xpZW50LWlkJztcclxuICAgIC8vIGNvbnN0IGF6dXJlQ2xpZW50U2VjcmV0ID0gJ3lvdXItYXp1cmUtY2xpZW50LXNlY3JldCc7XHJcbiAgICAvLyBjb25zdCBhenVyZUlzc3VlclVybCA9ICdodHRwczovL3lvdXItYXp1cmUtaXNzdWVyLmNvbSc7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBDb2duaXRvIFVzZXIgUG9vbFxyXG4gICAgY29uc3QgdXNlclBvb2wgPSBuZXcgVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywgeyAgICAgIFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogZmFsc2UsXHJcbiAgICAgIG1mYTogY29nbml0by5NZmEuT1BUSU9OQUwsXHJcbiAgICAgIGFkdmFuY2VkU2VjdXJpdHlNb2RlOiBjb2duaXRvLkFkdmFuY2VkU2VjdXJpdHlNb2RlLkVORk9SQ0VELFxyXG4gICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlLCBwaG9uZTogdHJ1ZSB9LFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXMgOiB7XHJcbiAgICAgICAgJ3JvbGUnIDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWluTGVuOiAwLCBtYXhMZW46IDMwLCBtdXRhYmxlOiB0cnVlIH0pXHJcbiAgICAgIH1cclxuICAgICAgLy8gLi4uIG90aGVyIHVzZXIgcG9vbCBjb25maWd1cmF0aW9uc1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnVzZXJQb29sID0gdXNlclBvb2w7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgcHJvdmlkZXIgYXR0cmlidXRlIGZvciBtYXBwaW5nIEF6dXJlIGNsYWltc1xyXG4gICAgLy8gY29uc3QgcHJvdmlkZXJBdHRyaWJ1dGUgPSBuZXcgUHJvdmlkZXJBdHRyaWJ1dGUoe1xyXG4gICAgLy8gICBuYW1lOiAnY3VzdG9tX2F0dHInLFxyXG4gICAgLy8gICB0eXBlOiAnU3RyaW5nJyxcclxuICAgIC8vIH0pO1xyXG4gICAgdXNlclBvb2wuYWRkRG9tYWluKCdDb2duaXRvRG9tYWluJywge1xyXG4gICAgICBjb2duaXRvRG9tYWluOiB7XHJcbiAgICAgICAgZG9tYWluUHJlZml4OiBjb2duaXRvRG9tYWluTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgQXp1cmUgT0lEQyBpZGVudGl0eSBwcm92aWRlciB0byB0aGUgVXNlciBQb29sXHJcbiAgICAvLyBjb25zdCBhenVyZVByb3ZpZGVyID0gbmV3IFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0F6dXJlUHJvdmlkZXInLCB7XHJcbiAgICAvLyAgIGNsaWVudElkOiBhenVyZUNsaWVudElkLFxyXG4gICAgLy8gICBjbGllbnRTZWNyZXQ6IGF6dXJlQ2xpZW50U2VjcmV0LFxyXG4gICAgLy8gICBpc3N1ZXJVcmw6IGF6dXJlSXNzdWVyVXJsLFxyXG4gICAgLy8gICB1c2VyUG9vbDogdXNlclBvb2wsXHJcbiAgICAvLyAgIGF0dHJpYnV0ZU1hcHBpbmc6IHtcclxuICAgIC8vICAgICAvLyBlbWFpbDogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnZW1haWwnKSxcclxuICAgIC8vICAgICAvLyBmdWxsbmFtZTogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnbmFtZScpLFxyXG4gICAgLy8gICAgIC8vIGN1c3RvbToge1xyXG4gICAgLy8gICAgIC8vICAgY3VzdG9tS2V5OiBwcm92aWRlckF0dHJpYnV0ZSxcclxuICAgIC8vICAgICAvLyB9LFxyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gICAvLyAuLi4gb3RoZXIgb3B0aW9uYWwgcHJvcGVydGllc1xyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbCwgICAgICBcclxuICAgICAgLy8gc3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFtVc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuY3VzdG9tKGF6dXJlUHJvdmlkZXIucHJvdmlkZXJOYW1lKV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gdXNlclBvb2xDbGllbnQ7XHJcblxyXG4gICAgY29uc3QgYXV0aG9yaXplckhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhvcml6YXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYnNvY2tldC1hcGktYXV0aG9yaXplcicpLCB7XHJcbiAgICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICAgIGltYWdlOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMi5idW5kbGluZ0ltYWdlLFxyXG4gICAgICAgICAgY29tbWFuZDogW1xyXG4gICAgICAgICAgICAnYmFzaCcsICctYycsXHJcbiAgICAgICAgICAgICdwaXAgaW5zdGFsbCAtciByZXF1aXJlbWVudHMudHh0IC10IC9hc3NldC1vdXRwdXQgJiYgY3AgLWF1IC4gL2Fzc2V0LW91dHB1dCdcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksIFxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJVU0VSX1BPT0xfSURcIiA6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgXCJBUFBfQ0xJRU5UX0lEXCIgOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIHRoaXMubGFtYmRhQXV0aG9yaXplciA9IGF1dGhvcml6ZXJIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2wgSURcIiwge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBDbGllbnQgSURcIiwge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBDbGllbnQgTmFtZVwiLCB7XHJcbiAgICAvLyAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudE5hbWUgfHwgXCJcIixcclxuICAgIC8vIH0pO1xyXG5cclxuXHJcbiAgICBcclxuICB9XHJcbn1cclxuIl19