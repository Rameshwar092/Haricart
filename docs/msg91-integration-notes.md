# MSG91 integration notes

MSG91’s current official Send SMS documentation specifies a POST request to `https://control.msg91.com/api/v5/flow` with `accept: application/json`, `content-type: application/json`, and the MSG91 `authkey` header. The request body is a JSON flow payload and requires the MSG91 flow/template identifier, recipient mobile number, and the exact dynamic variable names configured in the flow.

MSG91’s official integration guide states that the mobile value must include the country code, the API auth key is static, and dynamic flow variables are case-sensitive. For Indian transactional messaging, the owner must configure an approved DLT sender/template in MSG91 before delivery can work. The older v1 endpoint documents `route=4` for transactional SMS, but the current v5 Flow API is the implementation target.

Official sources:

1. https://docs.msg91.com/sms/send-sms
2. https://msg91.com/help/api/how-can-i-integrate-sms-api
3. https://api.msg91.com/apidoc/textsms/send-sms-v1.php
