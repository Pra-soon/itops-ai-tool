import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { ChatBotApi } from "../chatbot-api";
export interface WebsiteProps {
    readonly userPoolId: string;
    readonly userPoolClientId: string;
    readonly api: ChatBotApi;
    readonly websiteBucket: s3.Bucket;
}
export declare class Website extends Construct {
    readonly distribution: cf.CloudFrontWebDistribution;
    constructor(scope: Construct, id: string, props: WebsiteProps);
}
