import {
  BreadcrumbGroup,
  ContentLayout,
  Header,
  SpaceBetween,
  Alert
} from "@cloudscape-design/components";
import {
  Authenticator,
  Heading,
  useTheme,
} from "@aws-amplify/ui-react";
import BaseAppLayout from "../../components/base-app-layout";
import useOnFollow from "../../common/hooks/use-on-follow";
import DataFileUpload from "./data-file-upload";
import { CHATBOT_NAME } from "../../common/constants";
import { useState, useEffect } from "react";
import { Auth } from "aws-amplify";

export default function AddData() {
  const onFollow = useOnFollow();
  const { tokens } = useTheme();
  const [admin, setAdmin] = useState<boolean>(false);

  // fix broken aria menu
  useEffect(() => {
    const fixAriaMenus = () => {
      const problematicMenus = document.querySelectorAll('ul.awsui_options-list_19gcf_1hl2l_141');
  
      problematicMenus.forEach((menu) => {
        if (menu.getAttribute('role') === 'menu') {
          menu.removeAttribute('role');
        }
      });
    };
  
    // runs this initally
    fixAriaMenus();
  
    const observer = new MutationObserver(() => {
      fixAriaMenus();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const result = await Auth.currentAuthenticatedUser();
      if (!result || Object.keys(result).length === 0) {
        console.log("Signed out!")
        Auth.signOut();
        return;
      }

      try {
        const result = await Auth.currentAuthenticatedUser();
        const admin = result?.signInUserSession?.idToken?.payload["custom:role"]
        if (admin) {
          const data = JSON.parse(admin);
          if (data.includes("Admin")) {
            setAdmin(true);
          }
        }
      }
      catch (e){
        console.log(e);
      }
    })();
  }, []);

  if (!admin) {
    return (
      <div
        style={{
          height: "90vh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Alert header="Configuration error" type="error">
          You are not authorized to view this page!
        </Alert>
      </div>
    );
  }
  return (    
    <BaseAppLayout
      contentType="cards"
      breadcrumbs={
        <BreadcrumbGroup
          onFollow={onFollow}
          items={[
            {
              text: CHATBOT_NAME,
              href: "/",
            },

            {
              text: "Add Data",
              href: "/admin/add-data",
            },
          ]}
          ariaLabel="Breadcrumbs"
        />
      }
      content={
        <ContentLayout header={<Header variant="h1">Add Data</Header>}>
          <SpaceBetween size="l">
                        <DataFileUpload                                           
                      />
          </SpaceBetween>
        </ContentLayout>
      }
    />    
  );
}
