import { Construct } from "constructs";
import { ChatBotApi } from "../chatbot-api";
export interface UserInterfaceProps {
    readonly userPoolId: string;
    readonly userPoolClientId: string;
    readonly api: ChatBotApi;
    readonly cognitoDomain: string;
}
export declare class UserInterface extends Construct {
    constructor(scope: Construct, id: string, props: UserInterfaceProps);
}
