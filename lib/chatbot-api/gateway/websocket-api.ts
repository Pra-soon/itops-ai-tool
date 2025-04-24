import * as cdk from "aws-cdk-lib";
import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

// import { NagSuppressions } from "cdk-nag";

interface WebsocketBackendAPIProps {
  // readonly userPool: UserPool;
  // readonly api: appsync.GraphqlApi;
  readonly logWriteRole: iam.Role;
}

export class WebsocketBackendAPI extends Construct {
  public readonly wsAPI: apigwv2.WebSocketApi;
  public readonly wsAPIStage: apigwv2.WebSocketStage;
  constructor(
    scope: Construct,
    id: string,
    props: WebsocketBackendAPIProps
  ) {
    super(scope, id);
    // Create the main Message Topic acting as a message bus
    const webSocketApi = new apigwv2.WebSocketApi(this, 'WS-API');
    const webSocketApiStage = new apigwv2.WebSocketStage(this, 'WS-API-prod', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,      
    });

    this.wsAPI = webSocketApi;
    this.wsAPIStage = webSocketApiStage;

    const websocketLogGroup = new logs.LogGroup(this, "APIGatewayWebSocketLogGroup");

    const stage = webSocketApiStage.node.defaultChild as apigwv2.CfnStage;

    stage.defaultRouteSettings = {
      loggingLevel: "INFO",
      detailedMetricsEnabled: true,
      dataTraceEnabled: true,
    }

    stage.accessLogSettings = {
      destinationArn: websocketLogGroup.logGroupArn,
      format: JSON.stringify({
        "requestId": "$context.requestId",
        "ip": "$context.identity.sourceIp",
        "caller": "$context.identity.caller",
        "user": "$context.identity.user",
        "requestTime": "$context.requestTime",
        "eventType": "$context.eventType",
        "routeKey": "$context.routeKey",
        "status": "$context.status",
        "connectionId": "$context.connectionId"
      })
    }

    websocketLogGroup.grantWrite(props.logWriteRole)
  }

}
