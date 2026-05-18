import nodemailer from "nodemailer";
import { Resend } from "resend";

const buildEmailContent = ({
  candidateName,
  title,
  description,
  link,
  pin,
  scheduledAt
}) => {
  const dateStr = new Date(scheduledAt).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Interview Invitation</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dbe3ea;">

<tr>
<td style="background:#101828;padding:28px 36px;">
<p style="margin:0;color:#9db0c8;font-size:11px;">
Interview operations
</p>

<h1 style="margin:0;color:white;">
HireTrack
</h1>
</td>
</tr>

<tr>
<td style="padding:36px;">

<p>Hello ${candidateName},</p>

<h2>You have been invited for an interview</h2>

<p><b>Position:</b> ${title}</p>

<p><b>Scheduled:</b> ${dateStr}</p>

<p><b>PIN:</b> ${pin}</p>

${
  description
    ? `<p>${description}</p>`
    : ""
}

<a href="${link}"
style="
display:inline-block;
background:#2457f5;
color:white;
padding:12px 24px;
text-decoration:none;
border-radius:8px;
margin-top:20px;
">
Join Interview Room
</a>

<p>
Or copy:
<a href="${link}">
${link}
</a>
</p>

</td>
</tr>

<tr>
<td style="padding:20px;background:#f4f7fb;">

<p style="font-size:12px;color:gray;">
This email was sent by HireTrack
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`;

  const text = `
Hello ${candidateName},

You are invited for ${title}

Interview time: ${dateStr}

Link: ${link}

PIN: ${pin}

Regards,
HireTrack
`;

  return { html, text };
};

const getTransporter = () => {
  if (process.env.EMAIL_PROVIDER === "resend") {
    return new Resend(
      process.env.RESEND_API_KEY
    );
  }

  return nodemailer.createTransport({
    host:
      process.env.SMTP_HOST ||
      "smtp.gmail.com",

    port:Number(
      process.env.SMTP_PORT || 465
    ),

    secure:
      process.env.SMTP_SECURE==="true",

    auth:process.env.SMTP_USER
      ?{
          user:process.env.SMTP_USER,
          pass:process.env.SMTP_PASS
       }
      :undefined
  });
};

const sendEmail = async ({
  to,
  subject,
  text,
  html
}) => {

try{

const transporter =
getTransporter();

if(
process.env.EMAIL_PROVIDER
==="resend"
){

await transporter.emails.send({

from:
process.env.EMAIL_FROM,

to,

subject,

text,

html

});

return{
sent:true,
provider:"resend"
};

}

await transporter.sendMail({

from:
process.env.EMAIL_FROM ||
"HireTrack <no-reply@hiretrack.local>",

to,

subject,

text,

html

});

return{
sent:true,
provider:"smtp"
};

}
catch(error){

return{

sent:false,

provider:
process.env.EMAIL_PROVIDER
||"smtp",

reason:
error.response
||error.message

};

}

};

export const testEmailConnection =
async()=>{

const provider=
process.env.EMAIL_PROVIDER
||"smtp";

if(provider==="resend"){

if(
!process.env.RESEND_API_KEY
){

console.log(
"❌ Missing RESEND_API_KEY"
);

}else{

console.log(
"✅ Resend configured"
);

}

return;

}

try{

await getTransporter()
.verify();

console.log(
"✅ SMTP verified"
);

}
catch(error){

console.log(
"❌ SMTP failed:",
error.message
);

}

};

export const sendInterviewInvitation =
async({

to,
candidateName,
title,
description,
link,
pin,
scheduledAt

})=>{

const subject=
`Interview invitation: ${title}`;

const {
html,
text
}=buildEmailContent({

candidateName,
title,
description,
link,
pin,
scheduledAt

});

return sendEmail({

to,
subject,
text,
html

});

};