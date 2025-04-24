"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInterface = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const constructs_1 = require("constructs");
const node_child_process_1 = require("node:child_process");
const path = require("node:path");
const generate_app_1 = require("./generate-app");
const cdk_nag_1 = require("cdk-nag");
const utils_1 = require("../shared/utils");
const constants_1 = require("../constants");
class UserInterface extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const appPath = path.join(__dirname, "app");
        const buildPath = path.join(appPath, "dist");
        const uploadLogsBucket = new s3.Bucket(this, "WebsiteLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            // bucketName: props.config.privateWebsite ? props.config.domain : undefined,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "index.html",
            enforceSSL: true,
            serverAccessLogsBucket: uploadLogsBucket,
        });
        // Deploy either Private (only accessible within VPC) or Public facing website
        let apiEndpoint;
        let websocketEndpoint;
        let distribution;
        const publicWebsite = new generate_app_1.Website(this, "Website", { ...props, websiteBucket: websiteBucket });
        distribution = publicWebsite.distribution;
        const exportsAsset = s3deploy.Source.jsonData("aws-exports.json", {
            Auth: {
                region: cdk.Aws.REGION,
                userPoolId: props.userPoolId,
                userPoolWebClientId: props.userPoolClientId,
                oauth: {
                    domain: props.cognitoDomain.concat(".auth.us-east-1.amazoncognito.com"),
                    scope: ["aws.cognito.signin.user.admin", "email", "openid", "profile"],
                    redirectSignIn: "https://" + distribution.distributionDomainName,
                    redirectSignOut: "https://myapplications.microsoft.com/",
                    responseType: "code"
                }
            },
            httpEndpoint: props.api.httpAPI.restAPI.url,
            wsEndpoint: props.api.wsAPI.wsAPIStage.url,
            federatedSignInProvider: constants_1.OIDCIntegrationName
        });
        const asset = s3deploy.Source.asset(appPath, {
            bundling: {
                image: cdk.DockerImage.fromRegistry("public.ecr.aws/sam/build-nodejs18.x:latest"),
                command: [
                    "sh",
                    "-c",
                    [
                        "npm --cache /tmp/.npm install",
                        `npm --cache /tmp/.npm run build`,
                        "cp -aur /asset-input/dist/* /asset-output/",
                    ].join(" && "),
                ],
                local: {
                    tryBundle(outputDir) {
                        try {
                            const options = {
                                stdio: "inherit",
                                env: {
                                    ...process.env,
                                },
                            };
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" ci`, options);
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" run build`, options);
                            utils_1.Utils.copyDirRecursive(buildPath, outputDir);
                        }
                        catch (e) {
                            console.error(e);
                            return false;
                        }
                        return true;
                    },
                },
            },
        });
        new s3deploy.BucketDeployment(this, "UserInterfaceDeployment", {
            prune: false,
            sources: [asset, exportsAsset],
            destinationBucket: websiteBucket,
            distribution: distribution
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(uploadLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
    }
}
exports.UserInterface = UserInterface;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFHbkMseUNBQXlDO0FBQ3pDLDBEQUEwRDtBQUMxRCwyQ0FBdUM7QUFDdkMsMkRBRzRCO0FBQzVCLGtDQUFrQztBQUVsQyxpREFBd0M7QUFDeEMscUNBQTBDO0FBQzFDLDJDQUF1QztBQUN2Qyw0Q0FBbUQ7QUFTbkQsTUFBYSxhQUFjLFNBQVEsc0JBQVM7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTdDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNoRSxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDekQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLDZFQUE2RTtZQUM3RSxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLG9CQUFv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QixDQUFDLENBQUM7UUFHSDs7V0FFRztRQUNILHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLGdCQUFnQixFQUNoQjtZQUNFO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSw0REFBNEQ7YUFDckU7U0FDRixDQUNGLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFoSEQsc0NBZ0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgY2YgZnJvbSBcImF3cy1jZGstbGliL2F3cy1jbG91ZGZyb250XCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudFwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7XG4gIEV4ZWNTeW5jT3B0aW9uc1dpdGhCdWZmZXJFbmNvZGluZyxcbiAgZXhlY1N5bmMsXG59IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgQ2hhdEJvdEFwaSB9IGZyb20gXCIuLi9jaGF0Ym90LWFwaVwiO1xuaW1wb3J0IHsgV2Vic2l0ZSB9IGZyb20gXCIuL2dlbmVyYXRlLWFwcFwiXG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuaW1wb3J0IHsgVXRpbHMgfSBmcm9tIFwiLi4vc2hhcmVkL3V0aWxzXCJcbmltcG9ydCB7IE9JRENJbnRlZ3JhdGlvbk5hbWUgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlckludGVyZmFjZVByb3BzIHtcbiAgcmVhZG9ubHkgdXNlclBvb2xJZDogc3RyaW5nO1xuICByZWFkb25seSB1c2VyUG9vbENsaWVudElkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGFwaTogQ2hhdEJvdEFwaTtcbiAgcmVhZG9ubHkgY29nbml0b0RvbWFpbiA6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFVzZXJJbnRlcmZhY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogVXNlckludGVyZmFjZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGFwcFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCBcImFwcFwiKTtcbiAgICBjb25zdCBidWlsZFBhdGggPSBwYXRoLmpvaW4oYXBwUGF0aCwgXCJkaXN0XCIpO1xuXG4gICAgY29uc3QgdXBsb2FkTG9nc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJXZWJzaXRlTG9nc0J1Y2tldFwiLCB7XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiV2Vic2l0ZUJ1Y2tldFwiLCB7XG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgLy8gYnVja2V0TmFtZTogcHJvcHMuY29uZmlnLnByaXZhdGVXZWJzaXRlID8gcHJvcHMuY29uZmlnLmRvbWFpbiA6IHVuZGVmaW5lZCxcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiBcImluZGV4Lmh0bWxcIixcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiBcImluZGV4Lmh0bWxcIixcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiB1cGxvYWRMb2dzQnVja2V0LFxuICAgIH0pO1xuXG4gICAgLy8gRGVwbG95IGVpdGhlciBQcml2YXRlIChvbmx5IGFjY2Vzc2libGUgd2l0aGluIFZQQykgb3IgUHVibGljIGZhY2luZyB3ZWJzaXRlXG4gICAgbGV0IGFwaUVuZHBvaW50OiBzdHJpbmc7XG4gICAgbGV0IHdlYnNvY2tldEVuZHBvaW50OiBzdHJpbmc7XG4gICAgbGV0IGRpc3RyaWJ1dGlvbjtcblxuICAgIGNvbnN0IHB1YmxpY1dlYnNpdGUgPSBuZXcgV2Vic2l0ZSh0aGlzLCBcIldlYnNpdGVcIiwgeyAuLi5wcm9wcywgd2Vic2l0ZUJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCB9KTtcbiAgICBkaXN0cmlidXRpb24gPSBwdWJsaWNXZWJzaXRlLmRpc3RyaWJ1dGlvblxuXG5cblxuICAgIGNvbnN0IGV4cG9ydHNBc3NldCA9IHMzZGVwbG95LlNvdXJjZS5qc29uRGF0YShcImF3cy1leHBvcnRzLmpzb25cIiwge1xuICAgICAgQXV0aDoge1xuICAgICAgICByZWdpb246IGNkay5Bd3MuUkVHSU9OLFxuICAgICAgICB1c2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbElkLFxuICAgICAgICB1c2VyUG9vbFdlYkNsaWVudElkOiBwcm9wcy51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBvYXV0aDoge1xuICAgICAgICAgIGRvbWFpbjogcHJvcHMuY29nbml0b0RvbWFpbi5jb25jYXQoXCIuYXV0aC51cy1lYXN0LTEuYW1hem9uY29nbml0by5jb21cIiksXG4gICAgICAgICAgc2NvcGU6IFtcImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluXCIsXCJlbWFpbFwiLCBcIm9wZW5pZFwiLCBcInByb2ZpbGVcIl0sXG4gICAgICAgICAgcmVkaXJlY3RTaWduSW46IFwiaHR0cHM6Ly9cIiArIGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxuICAgICAgICAgIC8vIHJlZGlyZWN0U2lnbk91dDogXCJodHRwczovL215YXBwbGljYXRpb25zLm1pY3Jvc29mdC5jb20vXCIsXG4gICAgICAgICAgcmVzcG9uc2VUeXBlOiBcImNvZGVcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaHR0cEVuZHBvaW50IDogcHJvcHMuYXBpLmh0dHBBUEkucmVzdEFQSS51cmwsXG4gICAgICB3c0VuZHBvaW50IDogcHJvcHMuYXBpLndzQVBJLndzQVBJU3RhZ2UudXJsLFxuICAgICAgZmVkZXJhdGVkU2lnbkluUHJvdmlkZXIgOiBPSURDSW50ZWdyYXRpb25OYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCBhc3NldCA9IHMzZGVwbG95LlNvdXJjZS5hc3NldChhcHBQYXRoLCB7XG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBpbWFnZTogY2RrLkRvY2tlckltYWdlLmZyb21SZWdpc3RyeShcbiAgICAgICAgICBcInB1YmxpYy5lY3IuYXdzL3NhbS9idWlsZC1ub2RlanMxOC54OmxhdGVzdFwiXG4gICAgICAgICksXG4gICAgICAgIGNvbW1hbmQ6IFtcbiAgICAgICAgICBcInNoXCIsXG4gICAgICAgICAgXCItY1wiLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIFwibnBtIC0tY2FjaGUgL3RtcC8ubnBtIGluc3RhbGxcIixcbiAgICAgICAgICAgIGBucG0gLS1jYWNoZSAvdG1wLy5ucG0gcnVuIGJ1aWxkYCxcbiAgICAgICAgICAgIFwiY3AgLWF1ciAvYXNzZXQtaW5wdXQvZGlzdC8qIC9hc3NldC1vdXRwdXQvXCIsXG4gICAgICAgICAgXS5qb2luKFwiICYmIFwiKSxcbiAgICAgICAgXSxcbiAgICAgICAgbG9jYWw6IHtcbiAgICAgICAgICB0cnlCdW5kbGUob3V0cHV0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnM6IEV4ZWNTeW5jT3B0aW9uc1dpdGhCdWZmZXJFbmNvZGluZyA9IHtcbiAgICAgICAgICAgICAgICBzdGRpbzogXCJpbmhlcml0XCIsXG4gICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGV4ZWNTeW5jKGBucG0gLS1zaWxlbnQgLS1wcmVmaXggXCIke2FwcFBhdGh9XCIgY2lgLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgZXhlY1N5bmMoYG5wbSAtLXNpbGVudCAtLXByZWZpeCBcIiR7YXBwUGF0aH1cIiBydW4gYnVpbGRgLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgVXRpbHMuY29weURpclJlY3Vyc2l2ZShidWlsZFBhdGgsIG91dHB1dERpcik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCBcIlVzZXJJbnRlcmZhY2VEZXBsb3ltZW50XCIsIHtcbiAgICAgIHBydW5lOiBmYWxzZSxcbiAgICAgIHNvdXJjZXM6IFthc3NldCwgZXhwb3J0c0Fzc2V0XSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBkaXN0cmlidXRpb25cbiAgICB9KTtcblxuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIHVwbG9hZExvZ3NCdWNrZXQsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcbiAgICAgICAgICByZWFzb246IFwiQnVja2V0IGlzIHRoZSBzZXJ2ZXIgYWNjZXNzIGxvZ3MgYnVja2V0IGZvciB3ZWJzaXRlQnVja2V0LlwiLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgICk7XG4gIH1cbn1cbiJdfQ==