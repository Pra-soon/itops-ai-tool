import { AppLayout, AppLayoutProps, Flashbar } from "@cloudscape-design/components";
import { useNavigationPanelState } from "../common/hooks/use-navigation-panel-state";
import NavigationPanel from "./navigation-panel";
import { ReactElement, useState, useContext, useEffect } from "react";
import {SessionRefreshContext} from "../common/session-refresh-context"
import { NotificationProvider, useNotifications } from "./notif-manager";
import NotificationBar from "./notif-flashbar"

export default function BaseAppLayout(
  props: AppLayoutProps & { info?: ReactElement }
) {
  const [navigationPanelState, setNavigationPanelState] =
    useNavigationPanelState();
  const [toolsOpen, setToolsOpen] = useState(false);
  // const {needsRefreshContext, setNeedsRefreshContext} = useContext(SessionRefreshContext);
  const [needsRefresh, setNeedsRefresh] = useState(true);
  const { notifications, addNotification } = useNotifications();

  // add button text to help panel icon
  useEffect(() => {
    const aside = document.querySelector('aside.awsui_show-tools_hyvsj_17ek5_1091.awsui_has-tools-form_hyvsj_17ek5_1069')
    const div = aside?.querySelector('.awsui_trigger-wrapper_hyvsj_17ek5_1266.awsui_remove-high-contrast-header_hyvsj_17ek5_669');
    const btn = div?.querySelector('button');
    
    if (btn) {
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = 'Help';
  
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

  // adding text to a button
  // ISSUE: shows text instead of icon
  useEffect(() => {
    const menuTriggerDiv = document.querySelector('.awsui_trigger-wrapper_hyvsj_17ek5_1266.awsui_remove-high-contrast-header_hyvsj_17ek5_669');
    const menuTriggerButton = menuTriggerDiv?.querySelector('button');
  
    if (menuTriggerButton) {
      // Ensure the button has an icon (already assumed to be present) and hidden text
      const hiddenSpan = document.createElement('span');
      hiddenSpan.innerText = 'Toggle sidebar navigation';
  
      // Makes text invisible for accessibility
      hiddenSpan.style.position = 'absolute';
      hiddenSpan.style.width = '1px';
      hiddenSpan.style.height = '1px';
      hiddenSpan.style.padding = '0';
      hiddenSpan.style.margin = '-1px';
      hiddenSpan.style.overflow = 'hidden';
      hiddenSpan.style.whiteSpace = 'nowrap';
      hiddenSpan.style.border = '0';
  
      menuTriggerButton.appendChild(hiddenSpan);
  
      // Set an appropriate aria-label for accessibility
      menuTriggerButton.setAttribute('aria-label', 'Toggle sidebar navigation');
    }
  }, []);

  return (
    <SessionRefreshContext.Provider value={{needsRefresh,setNeedsRefresh}}>
      <NotificationProvider>
    <AppLayout
      headerSelector="#awsui-top-navigation"
      navigation={<NavigationPanel />}
      navigationOpen={!navigationPanelState.collapsed}
      onNavigationChange={({ detail }) =>
        setNavigationPanelState({ collapsed: !detail.open })
      }
      toolsHide={props.info === undefined ? true : false}
      tools={props.info}
      toolsOpen={toolsOpen}
      stickyNotifications={true}
      notifications={<NotificationBar/>}
      onToolsChange={({ detail }) => setToolsOpen(detail.open)}
      {...props}
    />
    </NotificationProvider>
    </SessionRefreshContext.Provider>
  );
}
