import {
  Utils
} from "../utils"
import { AppConfig } from "../types"; 

export class ComprehendMedicalClient {
  private readonly API: string;
  constructor(protected _appConfig: AppConfig) {
    this.API = _appConfig.httpEndpoint.slice(0,-1);}

  async redactText(userInput: string) {
    const auth = await Utils.authenticate();
    try {
      console.log("inside the comprehend medical client")
      const response = await fetch(this.API + "/comprehend-medical-redact", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + auth,
        },
        body: JSON.stringify({
          "content": userInput,
        })
      });
      console.log(response);
      return (await response.json()).redacted_text;
    }
    catch (err) {
      console.log(err);
      return userInput;
    }
  }

}