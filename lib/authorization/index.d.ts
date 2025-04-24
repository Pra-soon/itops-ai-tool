import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
export declare class AuthorizationStack extends Construct {
    readonly lambdaAuthorizer: lambda.Function;
    readonly userPool: UserPool;
    readonly userPoolClient: UserPoolClient;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
