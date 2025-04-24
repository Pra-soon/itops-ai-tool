import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

// Import Lambda L2 construct
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { StepFunctionsStack } from './step-functions/step-functions';


interface LambdaFunctionStackProps {  
  readonly wsApiEndpoint : string;  
  readonly sessionTable : Table;
  readonly kendraIndex : kendra.CfnIndex;
  readonly kendraSource : kendra.CfnDataSource;
  readonly feedbackTable : Table;
  readonly feedbackBucket : s3.Bucket;
  readonly knowledgeBucket : s3.Bucket;
  readonly evalSummariesTable : Table;
  readonly evalResutlsTable : Table;
  readonly evalTestCasesBucket : s3.Bucket;
  //readonly kpiTable : Table;
}

export class LambdaFunctionStack extends cdk.Stack {  
  public readonly chatFunction : lambda.Function;
  public readonly sessionFunction : lambda.Function;
  public readonly feedbackFunction : lambda.Function;
  public readonly deleteS3Function : lambda.Function;
  public readonly getS3KnowledgeFunction : lambda.Function;
  public readonly getS3TestCasesFunction : lambda.Function;
  public readonly uploadS3KnowledgeFunction : lambda.Function;
  public readonly uploadS3TestCasesFunction : lambda.Function;
  public readonly syncKendraFunction : lambda.Function;
  public readonly chatInvocationsCounterFunction: lambda.Function;
  public readonly comprehendMedicalFunction: lambda.Function;
  public readonly kpiFunction : lambda.Function;
  public readonly handleEvalResultsFunction : lambda.Function;
  public readonly stepFunctionsStack : StepFunctionsStack;



  constructor(scope: Construct, id: string, props: LambdaFunctionStackProps) {
    super(scope, id);    

    const sessionAPIHandlerFunction = new lambda.Function(scope, 'SessionHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'session-handler')), // Points to the lambda directory
      handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "DDB_TABLE_NAME" : props.sessionTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    const kpiAPIHandlerFunction = new lambda.Function(scope, 'KPIHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'kpi-handler')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment: {
        //"DDB_TABLE_NAME" : props.sessionTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    kpiAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: ['arn:aws:dynamodb:us-east-1:807596108910:table/mec-chatbot-logs',
        'arn:aws:dynamodb:us-east-1:807596108910:table/mec-chatbot-logs' + "/index/*"]
    }));

    this.kpiFunction = kpiAPIHandlerFunction;
    
    sessionAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [props.sessionTable.tableArn, props.sessionTable.tableArn + "/index/*"]
    }));

    this.sessionFunction = sessionAPIHandlerFunction;



    // Define the Lambda function resource
    const websocketAPIFunction = new lambda.Function(scope, 'ChatHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-chat')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment : {
        "mvp_websocket__api_endpoint_test" : props.wsApiEndpoint.replace("wss","https"),
        "INDEX_ID" : props.kendraIndex.attrId,
        'SESSION_HANDLER' : sessionAPIHandlerFunction.functionName,
      },
      timeout: cdk.Duration.seconds(300)
    });
    websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:InvokeModel'
      ],
      resources: ["*"]
    }));

        
    websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kendra:Retrieve',
        'kendra:Query'
      ],
      resources: [props.kendraIndex.attrArn]
    }));

    websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction'
      ],
      resources: [this.sessionFunction.functionArn]
    }));

    websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject'
      ],
      resources: ['arn:aws:iam::807596108910:role/MECKnowledgeStack-ChatbotAPIKendraIndexRole0A5CCA00-mOwqNPZz42yg/*']
    }));
        
    this.chatFunction = websocketAPIFunction;

    const feedbackAPIHandlerFunction = new lambda.Function(scope, 'FeedbackHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'feedback-handler')), // Points to the lambda directory
      handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "FEEDBACK_TABLE" : props.feedbackTable.tableName,
        "FEEDBACK_S3_DOWNLOAD" : props.feedbackBucket.bucketName
      },
      timeout: cdk.Duration.seconds(30)
    });
    
    feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [props.feedbackTable.tableArn, props.feedbackTable.tableArn + "/index/*"]
    }));

    feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.feedbackBucket.bucketArn,props.feedbackBucket.bucketArn+"/*"]
    }));

    this.feedbackFunction = feedbackAPIHandlerFunction;
    
    const deleteS3APIHandlerFunction = new lambda.Function(scope, 'DeleteS3FilesHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/delete-s3')), // Points to the lambda directory
      handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "BUCKET" : props.knowledgeBucket.bucketName,        
      },
      timeout: cdk.Duration.seconds(30)
    });

    deleteS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.knowledgeBucket.bucketArn,props.knowledgeBucket.bucketArn+"/*"]
    }));
    this.deleteS3Function = deleteS3APIHandlerFunction;

    const getS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'GetS3KnowledgeFilesHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/get-s3')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "BUCKET" : props.knowledgeBucket.bucketName,        
      },
      timeout: cdk.Duration.seconds(30)
    });

    getS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.knowledgeBucket.bucketArn,props.knowledgeBucket.bucketArn+"/*"]
    }));
    this.getS3KnowledgeFunction = getS3KnowledgeAPIHandlerFunction;

    const getS3TestCasesAPIHandlerFunction = new lambda.Function(scope, 'GetS3TestCasesFilesHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-get-test-cases')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "BUCKET" : props.evalTestCasesBucket.bucketName,        
      },
      timeout: cdk.Duration.seconds(30)
    });

    getS3TestCasesAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.evalTestCasesBucket.bucketArn,props.evalTestCasesBucket.bucketArn+"/*"]
    }));
    this.getS3TestCasesFunction = getS3TestCasesAPIHandlerFunction;


    const kendraSyncAPIHandlerFunction = new lambda.Function(scope, 'SyncKendraHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/kendra-sync')), // Points to the lambda directory
      handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "KENDRA" : props.kendraIndex.attrId,      
        "SOURCE" : props.kendraSource.attrId  
      },
      timeout: cdk.Duration.seconds(30)
    });

    kendraSyncAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kendra:*'
      ],
      resources: [props.kendraIndex.attrArn, props.kendraSource.attrArn]
    }));
    this.syncKendraFunction = kendraSyncAPIHandlerFunction;

    const uploadS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'UploadS3KnowledgeFilesHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/upload-s3')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "BUCKET" : props.knowledgeBucket.bucketName,        
      },
      timeout: cdk.Duration.seconds(30)
    });

    uploadS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.knowledgeBucket.bucketArn,props.knowledgeBucket.bucketArn+"/*"]
    }));
    this.uploadS3KnowledgeFunction = uploadS3KnowledgeAPIHandlerFunction;

    const uploadS3TestCasesFunction = new lambda.Function(scope, 'UploadS3TestCasesFilesHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-upload')), // Points to the lambda directory
      handler: 'index.handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "BUCKET" : props.evalTestCasesBucket.bucketName,        
      },
      timeout: cdk.Duration.seconds(30)
    });

    uploadS3TestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:*'
      ],
      resources: [props.evalTestCasesBucket.bucketArn,props.evalTestCasesBucket.bucketArn+"/*"]
    }));
    this.uploadS3TestCasesFunction = uploadS3TestCasesFunction;


    const evalResultsAPIHandlerFunction = new lambda.Function(scope, 'EvalResultsHandlerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/eval-results-handler')), // Points to the lambda directory
      handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
      environment: {
        "EVALUATION_RESULTS_TABLE" : props.evalResutlsTable.tableName,
        "EVALUATION_SUMMARIES_TABLE" : props.evalSummariesTable.tableName
      }
    });
    evalResultsAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({ 
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [props.evalResutlsTable.tableArn, props.evalResutlsTable.tableArn + "/index/*", props.evalSummariesTable.tableArn, props.evalSummariesTable.tableArn + "/index/*"]
    }));
    this.handleEvalResultsFunction = evalResultsAPIHandlerFunction;
    props.evalResutlsTable.grantReadWriteData(evalResultsAPIHandlerFunction);
    props.evalSummariesTable.grantReadWriteData(evalResultsAPIHandlerFunction);

    this.stepFunctionsStack = new StepFunctionsStack(scope, 'StepFunctionsStack', {
      knowledgeBase: props.kendraIndex,
      evalSummariesTable: props.evalSummariesTable,
      evalResutlsTable: props.evalResutlsTable,
      evalTestCasesBucket: props.evalTestCasesBucket
    });

    const chatInvocationsCounterFunction = new lambda.Function(scope, 'ChatInvocationsCounterFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname, 'chat-invocations-counter')),
      handler: 'lambda_function.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        CHAT_FUNCTION_NAME: this.chatFunction.functionName,
      },    
    });

    chatInvocationsCounterFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:GetMetricStatistics'],
      resources: ['*'],
    }));

    this.chatInvocationsCounterFunction = chatInvocationsCounterFunction;

    const comprehendMedicalFunction = new lambda.Function(scope, 'comprehendMedicalFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname, 'comprehend-medical')),
      handler: 'lambda_function.lambda_handler',
      timeout: cdk.Duration.seconds(60),   
    });

    this.comprehendMedicalFunction = comprehendMedicalFunction;

    comprehendMedicalFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['comprehend:DetectPiiEntities'],
      resources: ['*'], // Adjust if specific resources are used.
    }));
    


  }
}
