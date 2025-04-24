import {
  ButtonDropdownProps,
  TopNavigation,
} from "@cloudscape-design/components";
import { Mode } from "@cloudscape-design/global-styles";
import { useEffect, useState } from "react";
import { StorageHelper } from "../common/helpers/storage-helper";
import { Auth } from "aws-amplify";
import useOnFollow from "../common/hooks/use-on-follow";
import { CHATBOT_NAME } from "../common/constants";
import styles from "../styles/global-header.module.scss";

export default function GlobalHeader() {
  const onFollow = useOnFollow();
  const [userName, setUserName] = useState<string | null>(null);
  const [theme, setTheme] = useState<Mode>(StorageHelper.getTheme());

  useEffect(() => {
    (async () => {
      const result = await Auth.currentAuthenticatedUser();
      // console.log(result);  
      if (!result || Object.keys(result).length === 0) {
        console.log("Signed out!")
        Auth.signOut();
        return;
      }

      // const userName = result?.attributes?.email;
      const userName = result?.signInUserSession?.idToken?.payload?.name;
      setUserName(userName);
      // const userName =  result?.attributes?.email;
      // setUserName(userName);
      // console.log(userName);
    })();
    
  }, []);

  useEffect(() => {
    // Locate the dropdown menu (<ul>)
    const dropdownMenu = document.querySelector('.awsui_options-list_19gcf_1hl2l_141.awsui_decrease-block-margin_19gcf_1hl2l_197');

    if (dropdownMenu) {
        dropdownMenu.setAttribute('role', 'menu');
      
        // Function to apply ARIA roles when children are added
        const applyRolesToChildren = () => {
            const dropdownMenu = document.querySelector('.awsui_options-list_19gcf_1hl2l_141.awsui_decrease-block-margin_19gcf_1hl2l_197');
            dropdownMenu.setAttribute('role', 'menubar');
            const childNodes = Array.from(dropdownMenu.childNodes).filter(
                (node) => node.nodeType === Node.ELEMENT_NODE 
                            && node.nodeName === 'LI'
            );

            // Add ARIA roles to each child node
            childNodes.forEach((node) => {
                const el = node as HTMLElement;
                el.setAttribute('role', 'menuitem');
                el.setAttribute('tabindex', '-1');
            });
        };

        // Create a MutationObserver to monitor for child changes
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                  applyRolesToChildren(); // Apply roles whenever children are added
                }
            }
        });

        // Start observing the menu for child changes
        observer.observe(dropdownMenu, { childList: true, subtree: true });

        // Apply roles initially
        applyRolesToChildren();
        
        // Cleanup the observer when the component unmounts
        return () => { observer.disconnect(); };
    }
  }, []);

  // add button text
  useEffect(() => {
    const menuTriggerDiv = document.querySelector('[data-utility-special="menu-trigger"]');
    const menuTriggerButton = menuTriggerDiv?.querySelector('button');
    if (menuTriggerButton) {
      menuTriggerButton.innerHTML = 'Open Profile';
    }
  }, []);

  const onChangeThemeClick = () => {
    if (theme === Mode.Dark) {
      setTheme(StorageHelper.applyTheme(Mode.Light));
    } else {
      setTheme(StorageHelper.applyTheme(Mode.Dark));
    }
  };
  const onUserProfileClick = ({
    detail,
  }: {
    detail: ButtonDropdownProps.ItemClickDetails;
  }) => {
    if (detail.id === "signout") {
      Auth.signOut();
    }
  };

  return (
    <div
      className={styles.navLogo}
      style={{ zIndex: 1002, top: 0, left: 0, right: 0, position: "fixed" }}
      id="awsui-top-navigation"
    >
      <nav role="navigation" aria-label="Top navigation">
        <TopNavigation
          identity={{
            href: "/",
            logo: { src: "/images/mayflower/stateseal-white.png", alt: CHATBOT_NAME + " Logo" },
            title: "ITOPS Inquiry Tool",
          }}
          utilities={[
            // {
            //   type: "button",
            //   text: "for internal use only- testing stage",
            // },
            {
              type: "button",
              text: theme === Mode.Dark ? "Light Mode" : "Dark Mode",
              onClick: onChangeThemeClick,
            },

            {
              type: "menu-dropdown",
              ariaLabel: "User profile dropdown menu",
              description: userName ?? "",
              iconName: "user-profile",
              onItemClick: onUserProfileClick,
              items: [
                {
                  id: "signout",
                  text: "Sign out",
                  ariaLabel: "Sign out of the application",
                },
              ],
            },
          ]}
        />
      </nav>
    </div>
  );
}
