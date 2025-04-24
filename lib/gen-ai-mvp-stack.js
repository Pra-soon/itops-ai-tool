"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenAiMvpStack = void 0;
const cdk = require("aws-cdk-lib");
const chatbot_api_1 = require("./chatbot-api");
const constants_1 = require("./constants");
const authorization_1 = require("./authorization");
const user_interface_1 = require("./user-interface");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class GenAiMvpStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // The code that defines your stack goes here
        // example resource
        // const queue = new sqs.Queue(this, 'GenAiMvpQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });
        // let authentication;
        // if (AUTHENTICATION) {
        //   authentication = new AuthorizationStack(this, "Authorization")
        // }
        const authentication = new authorization_1.AuthorizationStack(this, "Authorization");
        const chatbotAPI = new chatbot_api_1.ChatBotApi(this, "ChatbotAPI", { authentication });
        const userInterface = new user_interface_1.UserInterface(this, "UserInterface", { userPoolId: authentication.userPool.userPoolId,
            userPoolClientId: authentication.userPoolClient.userPoolClientId,
            cognitoDomain: constants_1.cognitoDomainName,
            api: chatbotAPI
        });
    }
}
exports.GenAiMvpStack = GenAiMvpStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLWFpLW12cC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlbi1haS1tdnAtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLCtDQUEyQztBQUMzQywyQ0FBK0Q7QUFDL0QsbURBQW9EO0FBQ3BELHFEQUFnRDtBQUVoRCw4Q0FBOEM7QUFFOUMsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw2Q0FBNkM7UUFFN0MsbUJBQW1CO1FBQ25CLHVEQUF1RDtRQUN2RCxpREFBaUQ7UUFDakQsTUFBTTtRQUNOLHNCQUFzQjtRQUN0Qix3QkFBd0I7UUFDeEIsbUVBQW1FO1FBQ25FLElBQUk7UUFDSixNQUFNLGNBQWMsR0FBRyxJQUFJLGtDQUFrQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNwRSxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFDLGNBQWMsRUFBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQzVELEVBQUMsVUFBVSxFQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUMvQyxnQkFBZ0IsRUFBRyxjQUFjLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtZQUNqRSxhQUFhLEVBQUcsNkJBQWlCO1lBQ2pDLEdBQUcsRUFBRyxVQUFVO1NBQ2pCLENBQUMsQ0FBQTtJQUVKLENBQUM7Q0FDRjtBQXhCRCxzQ0F3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4vY2hhdGJvdC1hcGlcIjtcbmltcG9ydCB7IEFVVEhFTlRJQ0FUSU9OLCBjb2duaXRvRG9tYWluTmFtZSB9IGZyb20gXCIuL2NvbnN0YW50c1wiXG5pbXBvcnQgeyBBdXRob3JpemF0aW9uU3RhY2sgfSBmcm9tIFwiLi9hdXRob3JpemF0aW9uXCJcbmltcG9ydCB7IFVzZXJJbnRlcmZhY2UgfSBmcm9tIFwiLi91c2VyLWludGVyZmFjZVwiXG5cbi8vIGltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcblxuZXhwb3J0IGNsYXNzIEdlbkFpTXZwU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBUaGUgY29kZSB0aGF0IGRlZmluZXMgeW91ciBzdGFjayBnb2VzIGhlcmVcblxuICAgIC8vIGV4YW1wbGUgcmVzb3VyY2VcbiAgICAvLyBjb25zdCBxdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0dlbkFpTXZwUXVldWUnLCB7XG4gICAgLy8gICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKVxuICAgIC8vIH0pO1xuICAgIC8vIGxldCBhdXRoZW50aWNhdGlvbjtcbiAgICAvLyBpZiAoQVVUSEVOVElDQVRJT04pIHtcbiAgICAvLyAgIGF1dGhlbnRpY2F0aW9uID0gbmV3IEF1dGhvcml6YXRpb25TdGFjayh0aGlzLCBcIkF1dGhvcml6YXRpb25cIilcbiAgICAvLyB9XG4gICAgY29uc3QgYXV0aGVudGljYXRpb24gPSBuZXcgQXV0aG9yaXphdGlvblN0YWNrKHRoaXMsIFwiQXV0aG9yaXphdGlvblwiKVxuICAgIGNvbnN0IGNoYXRib3RBUEkgPSBuZXcgQ2hhdEJvdEFwaSh0aGlzLCBcIkNoYXRib3RBUElcIiwge2F1dGhlbnRpY2F0aW9ufSk7XG4gICAgY29uc3QgdXNlckludGVyZmFjZSA9IG5ldyBVc2VySW50ZXJmYWNlKHRoaXMsIFwiVXNlckludGVyZmFjZVwiLFxuICAgICB7dXNlclBvb2xJZCA6IGF1dGhlbnRpY2F0aW9uLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICB1c2VyUG9vbENsaWVudElkIDogYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGNvZ25pdG9Eb21haW4gOiBjb2duaXRvRG9tYWluTmFtZSxcbiAgICAgIGFwaSA6IGNoYXRib3RBUElcbiAgICB9KVxuICAgIFxuICB9XG59XG4iXX0=