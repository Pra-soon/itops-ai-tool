import json
import jwt
import requests
import os
from jwt.algorithms import RSAAlgorithm

def lambda_handler(event, context):
    token = event['queryStringParameters']['Authorization']
    print(token)
    user_pool_id = os.environ.get('USER_POOL_ID')
    region = 'us-east-1'
    app_client_id = os.environ.get('APP_CLIENT_ID')
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    
    # Download JWKs and transform them to a key dictionary
    response = requests.get(keys_url)
    keys = response.json()['keys']
    key_dict = {key['kid']: key for key in keys}

    # Decode and validate the token
    headers = jwt.get_unverified_header(token)
    print(key_dict)
    print(headers)
    
    if headers['kid'] not in key_dict:
        print("Invalid key ID")
        return {"message": "Unauthorized"}
    
    key = key_dict[headers['kid']]
    public_key = RSAAlgorithm.from_jwk(json.dumps(key))
    print(public_key)

    # Validate the token
    try:
        claims = jwt.decode(token, public_key, algorithms=['RS256'], audience=app_client_id)
        print(claims)
        principalId = claims['sub']

        # Generate policy document
        policy_document = {
            'principalId': principalId,
            'policyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Action': 'execute-api:Invoke',
                    'Effect': 'Allow',
                    'Resource': event['methodArn']
                }]
            }
        }

        return policy_document
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return {"message": "Unauthorized"}
    except jwt.InvalidTokenError as e:
        print(f'Token validation error: {str(e)}')
        return {"message": "Unauthorized"}
