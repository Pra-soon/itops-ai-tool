"""
Purpose: Lambda functions to deal with requests surrounding KPIs (currently just chatbot uses/interctions)

Overview:
This file provides an AWS Lambda function designed to handle HTTP requests for managing KPIs in DynamoDB tables.
It supports operations for posting, retrieving, downloading, and deleting KPIs. Admin users can access all functionalities, while non-admins have limited permissions.

Environment variables:
- `INTERACTION_TABLE`: The name of the DynamoDB table storing interaction entries.
- `INTERACTION_S3_DOWNLOAD`: The S3 bucket used for storing downloadable interaction data CSV files.

Classes:
- `DecimalEncoder`: A custom JSON encoder class to convert `Decimal` objects into strings.

Functions:
- `lambda_handler`: Main entry point for the Lambda function. Routes incoming requests to below functions based on the HTTP method and user role.

- `post_interactions`: Handles POST requests to store chatbot uses in the DynamoDB table.
- `download_interactiosn`: Handles POST requests to generate and return a downloadable CSV file of chatbot uses within a specified date range.
- `get_interactions`: Handles GET requests to retrieve chatbot uses from the DynamoDB table with optional pagination support.
- `delete_interactions`: Handles DELETE requests to remove specific chatbot uses entries from the DynamoDB table.
- `increment_login`: Handles POST requests to store daily logins in the DynamoDB table. This is scheduled to run every weekday evening.
- `get_daily_logins`: Handles GET requests to retrieve daily logins.

Usage:
Deploy this file as part of an AWS Lambda function integrated with an API Gateway. 
"""

import json
import uuid
import boto3
import os
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('INTERACTION_TABLE'))
daily_login_table = dynamodb.Table(os.environ.get('DAILY_LOGIN_TABLE'))

from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)
    

def lambda_handler(event, context):
    # Determine the type of HTTP method
    admin = False
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        roles = json.loads(claims['custom:role'])
        if "Admin" in roles:                        
            #print("admin granted!")
            admin = True
        else:
            print("Caught error: attempted unauthorized admin access")
            admin = False
    except:
        print("Caught error: admin access and user roles are not present")
        return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps('Unable to check user role, please ensure you have Cognito configured correctly with a custom:role attribute.')
            }
    http_method = event.get('routeKey')
    if http_method == "POST /daily-logins":
        return increment_login(event)
    elif http_method == "GET /daily-logins": 
        return get_daily_logins(event)
    elif 'POST' in http_method:
        print(http_method)
        #if event.get('rawPath') == '/chatbot-use/download' and admin: #Idk what this means but it is not working. Unsure about RawPath
        if http_method == 'POST /chatbot-use/download' and admin:
            print('we are downloading')
            return download_interactiosn(event)
        return post_interactions(event)
    elif 'GET' in http_method and admin:
        return get_interactions(event)
    elif 'DELETE' in http_method and admin:
        return delete_interactions(event)
    else:
        return {
            'statusCode': 405,
            'body': json.dumps('Method Not Allowed')
        }

def get_daily_logins(event):
    try:
        query_params = event.get('queryStringParameters', {})
        # format: 2024-11-19
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        start_date = datetime.strptime(start_date, "%Y-%m-%d").strftime("%Y-%m-%d")
        end_date = datetime.strptime(end_date, "%Y-%m-%d").strftime("%Y-%m-%d")
        print(end_date)

        scan_kwargs = {}
        if start_date and end_date:
            scan_kwargs['FilterExpression'] = Attr('Timestamp').gte(start_date) & Attr('Timestamp').lte(end_date)
        response = daily_login_table.scan(**scan_kwargs)

        logins = response.get('Items', [])
        logins.sort(key=lambda x: x['Timestamp'])

        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 200,
            'body': json.dumps({'logins': logins}, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"Error retrieving daily logins: {str(e)}")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 500,
            'body': json.dumps({'error': f"Failed to retrieve daily logins: {str(e)}"})
        }
        
def increment_login(event):
    # this runs every evening to update the date's count
    date = datetime.utcnow().strftime('%Y-%m-%d')
    try:
        response = table.scan(
            FilterExpression=Attr("Timestamp").begins_with(date),
            ProjectionExpression="Username"
        )
        
        # calculate daily logins by creating a set of the unique users
        unique_usernames = set(item['Username'] for item in response.get('Items', []))
        unique_user_count = len(unique_usernames)
        daily_login_table.put_item(
            Item={
                'Timestamp': date,
                'Count': unique_user_count
            }
        )

        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 200,
            'body': json.dumps(f'Login count updated for {date}')
        }
            
    except Exception as e:
        print("error")
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to increment logins: ' + str(e))
        }
        

def post_interactions(event):
    try:
        # load JSON data from the event body
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        body = json.loads(event['body'], parse_float=Decimal)

        interaction_data = body.get('interaction_data')
        print(interaction_data)
        
        # return error if can't access data for some reason
        if not interaction_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing interaction_data'})
            }        
        
        # make item and add to table
        username = interaction_data.get('Username')
        user_message = interaction_data.get('UserPrompt')
        bot_response = interaction_data.get('BotMessage')
        response_time = interaction_data.get('ResponseTime', Decimal(0))
        item = {
            'Username': username,
            'BotMessage': bot_response,
            'ResponseTime': response_time,
            'UserPrompt': user_message,
            'Timestamp': timestamp
        }
        
        table.put_item(Item=item)
        if interaction_data == 0:
            print("Negative feedback placed")
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 200,
            'body': json.dumps('POST successful')
        }
        
    except Exception as e:
        print("Caught error: DynamoDB error - could not add interaction to table: " + str(e))
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to store interaction: ' + str(e))
        }

def download_interactiosn(event):

    data = json.loads(event['body'])
    start_time = data.get('startTime')
    end_time = data.get('endTime')
    
    start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M:%S.%fZ')
    end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M:%S.%fZ')

    # convert time to right time
    start_time = start_time.isoformat(timespec='milliseconds') + 'Z'
    end_time = end_time.isoformat(timespec='milliseconds') + 'Z'

    if not start_time or not end_time:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required query parameters'})
        }

    scan_kwargs = {
        'FilterExpression': Attr("Timestamp").between(start_time, end_time),
    }

    response = None
    try:
        response = table.scan(**scan_kwargs)
        
    except Exception as e:
        print("Caught error: DynamoDB error - could not lollowd interaction data for download")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*",
            },
            'statusCode': 500,
            'body': json.dumps('Failed to retrieve interaction data for download: ' + str(e))
        }

    def clean_csv(field):
        field = str(field).replace('"', '""')
        
        # this is needed cuz a lot of the bot messages contain commas which will mess up the file
        if ',' in field or '\n' in field or '"' in field:
            field = f'"{field}"'
        
        return field
    
    # header column
    csv_content = "Timestamp,Username,User Prompt,Bot Message,Response Time\n"

    for item in response['Items']:
        csv_content += (
            f"{clean_csv(item['Timestamp'])},"
            f"{clean_csv(item['Username'])},"
            f"{clean_csv(item['UserPrompt'])},"
            f"{clean_csv(item['BotMessage'])},"
            f"{clean_csv(item['ResponseTime'])}\n"
        )    
        
    s3 = boto3.client('s3')
    S3_DOWNLOAD_BUCKET = os.environ["INTERACTION_S3_DOWNLOAD"]

    # readable dates
    start_date = datetime.strptime(start_time, '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y-%m-%d')
    end_date = datetime.strptime(end_time, '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y-%m-%d')

    try:
        file_name = f"interaction-data-{start_time}_to_{end_time}.csv"
        s3.put_object(Bucket=S3_DOWNLOAD_BUCKET, Key=file_name, Body=csv_content)
        
        presigned_url = s3.generate_presigned_url('get_object', Params={'Bucket': S3_DOWNLOAD_BUCKET, 'Key': file_name}, ExpiresIn=3600)

    except Exception as e:
        print("Caught error: S3 error - could not generate download link")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*",
            },
            'statusCode': 500,
            'body': json.dumps('Failed to generate download link: ' + str(e))
        }

    return {
        'headers': {
            'Access-Control-Allow-Origin': "*",
        },
        'statusCode': 200,
        'body': json.dumps({'download_url': presigned_url})
    }
    
def get_interactions(event):
    try:
        query_params = event.get('queryStringParameters', {})
        print("Query params:", query_params)
        start_time = query_params.get('startTime')
        end_time = query_params.get('endTime')
        exclusive_start_key = query_params.get('nextPageToken') # pagination token
        print(f"startTime: {start_time}, endTime: {end_time}, nextPageToken: {exclusive_start_key}")
        
        start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M:%S.%fZ')
        end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M:%S.%fZ')
        # dates in right format
        start_time = start_time.isoformat(timespec='milliseconds') + 'Z'
        end_time = end_time.isoformat(timespec='milliseconds') + 'Z'
        
        if not start_time or not end_time:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required query parameters'})
            }

        scan_kwargs = {
            'FilterExpression': Attr("Timestamp").between(start_time, end_time),
        }
        
        if exclusive_start_key:
            scan_kwargs['ExclusiveStartKey'] = json.loads(exclusive_start_key)

        # perform the query and sort table 
        response = table.scan(**scan_kwargs)
        response['Items'].sort(key=lambda x: datetime.strptime(x['Timestamp'], '%Y-%m-%dT%H:%M:%SZ'), reverse=True)

        body = {
            'Items': response.get('Items', [])
        }

        if 'LastEvaluatedKey' in response:
            body['NextPageToken'] = json.dumps(response['LastEvaluatedKey'])

        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 200,
            'body': json.dumps(body, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"Caught error: {str(e)}")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 500,
            'body': json.dumps({'error': f"Failed to retrieve data: {str(e)}"})
        }
    
def delete_interactions(event):
    try:
        query_params = event.get('queryStringParameters', {})
        timestamp = query_params.get('Timestamp')

        if not timestamp:
            return {
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'statusCode': 400,
                'body': json.dumps('Missing timestamp')
            }
            
        response = table.delete_item(
            Key={
                'Timestamp': timestamp,
            }
        )
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 200,
            'body': json.dumps({'message': 'Interaction item deleted successfully'})
        }
    except Exception as e:
        print("Caught error: DynamoDB error - could not delete interaction item")
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 500,
            'body': json.dumps('Failed to delete interaction item: ' + str(e))
        }