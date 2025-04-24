import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as s3 from "aws-cdk-lib/aws-s3";
interface LambdaFunctionStackProps {
    readonly wsApiEndpoint: string;
    readonly sessionTable: Table;
    readonly kendraIndex: kendra.CfnIndex;
    readonly kendraSource: kendra.CfnDataSource;
    readonly feedbackTable: Table;
    readonly feedbackBucket: s3.Bucket;
    readonly knowledgeBucket: s3.Bucket;
}
export declare class LambdaFunctionStack extends cdk.Stack {
    readonly chatFunction: lambda.Function;
    readonly sessionFunction: lambda.Function;
    readonly feedbackFunction: lambda.Function;
    readonly deleteS3Function: lambda.Function;
    readonly getS3Function: lambda.Function;
    readonly uploadS3Function: lambda.Function;
    readonly syncKendraFunction: lambda.Function;
    readonly chatInvocationsCounterFunction: lambda.Function;
    readonly comprehendMedicalFunction: lambda.Function;
    readonly kpiFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: LambdaFunctionStackProps);
}
export {};
