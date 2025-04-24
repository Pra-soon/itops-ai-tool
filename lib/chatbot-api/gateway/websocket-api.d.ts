import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import { Construct } from "constructs";
interface WebsocketBackendAPIProps {
}
export declare class WebsocketBackendAPI extends Construct {
    readonly wsAPI: apigwv2.WebSocketApi;
    readonly wsAPIStage: apigwv2.WebSocketStage;
    constructor(scope: Construct, id: string, props: WebsocketBackendAPIProps);
}
export {};
