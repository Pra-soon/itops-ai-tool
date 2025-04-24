import { AuthorizationStack } from '../authorization';
import { WebsocketBackendAPI } from "./gateway/websocket-api";
import { RestBackendAPI } from "./gateway/rest-api";
import { Construct } from "constructs";
export interface ChatBotApiProps {
    readonly authentication: AuthorizationStack;
}
export declare class ChatBotApi extends Construct {
    readonly httpAPI: RestBackendAPI;
    readonly wsAPI: WebsocketBackendAPI;
    constructor(scope: Construct, id: string, props: ChatBotApiProps);
}
