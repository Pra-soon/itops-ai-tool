import json
import os
import boto3
import ast
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('FEEDBACK_TABLE'))
admin_emails = os.environ.get('ADMIN_EMAILS').split(' ')

sender = os.environ.get('SENDER_EMAIL')
pswd = os.environ.get('SENDER_PASSWORD')

def lambda_handler(event, context):
    # calculate time range
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    now_str = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    seven_days_ago_str = seven_days_ago.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Query the table for feedback within the last 7 days
    try:
        response = table.scan(
            FilterExpression="CreatedAt BETWEEN :start AND :end",
            ExpressionAttributeValues={
                ":start": seven_days_ago_str,
                ":end": now_str
            }
        )
        
        feedback_items = response.get('Items', [])
        print(f"Found {len(feedback_items)} feedback entries.")
        print(feedback_items)
        feedback_text = ""
        if feedback_items:
            # Prepare the feedback data to send in the email
            for item in feedback_items:
                sources_list = ast.literal_eval(item.get('Sources', '[]'))
                sources_txt = "<ul>"

                for source in sources_list:
                    sources_txt += f'<li><a href="{source["uri"]}">{source["title"]}</a></li>'
                    
                sources_txt += "</ul>"
                item_txt = f"""<p><b>Created at: {item.get('CreatedAt', 'N/A')}</b></p>
                <p>Topic: {item.get('Topic', 'N/A')}</p>
                <p>Problem: {item.get('Problem', 'N/A')}</p>
                <p>Feedback comments: {item.get('FeedbackComments', 'N/A')}</p>
                <p>User prompt: {item.get('UserPrompt', 'N/A')}</p>
                <p>Chatbot message: {item.get('ChatbotMessage', 'N/A')}</p>
                <p>Sources:</p>{sources_txt}<br>"""
            
                feedback_text += item_txt
                
            send_email(feedback_text, now)
        else:
            send_email("There is no new feedback to report from the last 7 days.", now)

        return {
            'statusCode': 200,
            'body': json.dumps(feedback_items, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"Error fetching feedback: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error fetching feedback from DynamoDB')
        }
        
def send_email(feedback_data, timestamp):
    """
    Sends an email with the feedback data to the admin list.
    """
    readable_time = timestamp.strftime('%b. %d, %Y %H:%M')
    subject = f"Weekly Feedback Report - {readable_time}"
    body = f"Here is the feedback collected in the past 7 days:\n\n{feedback_data}"
    
    
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = ", ".join(admin_emails)
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender, pswd)
        text = msg.as_string()
        server.sendmail(sender, ", ".join(admin_emails), text)
        server.quit()
        
        return {
            'statusCode': 200,
            'body': f"Email successfully sent to {admin_emails}"
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': f"Error: {str(e)}"
        }