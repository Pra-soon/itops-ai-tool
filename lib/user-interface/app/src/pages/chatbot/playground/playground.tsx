import BaseAppLayout from "../../../components/base-app-layout";
import Chat from "../../../components/chatbot/chat";

import { Link, useParams } from "react-router-dom";
import { Alert, Header, HelpPanel } from "@cloudscape-design/components";
import EmailPanel from "../../../components/chatbot/email-panel"
import { useState, useEffect } from "react";
import { ChatBotHistoryItem } from "../../../components/chatbot/types";

export default function Playground() {
  const { sessionId } = useParams();
  const [emailPanelShown, setEmailPanelShown] = useState<boolean>(false);
  const [messageHistoryForEmail, setMessageHistoryForEmail] = useState<ChatBotHistoryItem[]>([]);

  useEffect(() => {
    console.log("email history updated")
    console.log(messageHistoryForEmail);
  },[messageHistoryForEmail]);
  // add button text to sidebar nav collapse button
  useEffect(() => {
    const div = document.querySelector('.awsui_hide-tools_hyvsj_17ek5_1079');
    const btn = div?.querySelector('button');
    
    if (btn) {
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = '[ADD ACCURATE TEXT]';
  
      // makes text invisible
      hiddenSpan.style.position = 'absolute';
      hiddenSpan.style.width = '1px';
      hiddenSpan.style.height = '1px';
      hiddenSpan.style.padding = '0';
      hiddenSpan.style.margin = '-1px';
      hiddenSpan.style.overflow = 'hidden';
      hiddenSpan.style.whiteSpace = 'nowrap';
      hiddenSpan.style.border = '0';
  
      btn.appendChild(hiddenSpan);
    }
  
  }, []);

  return (    
    <BaseAppLayout
      info={
        <HelpPanel header={<Header variant="h3">Using the chat</Header>}>
          <p>
            This chatbot application allows users to ask questions about the MassHealth eligibility information.
          </p>
          <h3>Session history</h3>
          <p>
            All conversations are saved and can be later accessed in the navigation bar.
          </p>
        </HelpPanel>
      }
      toolsWidth={300}
      splitPanel={<EmailPanel isHidden={false} messageHistory={messageHistoryForEmail}/>}
      content={
       <div>
      {/* <Chat sessionId={sessionId} /> */}
      
      <Chat sessionId={sessionId} updateEmailFunction={setMessageHistoryForEmail} />
      </div>
     }
    />    
  );
}
