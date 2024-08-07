import { Resend } from "npm:resend";
import { renderEmail_2024_07_24 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-07-24.tsx";

const resend = new Resend(Deno.env.get("API_KEY_RESEND"));

const TEMPLATE_MAPPER_NEWSLETTER: Record<
  string,
  {
    template: (props: { unsubscribeUrl: string }) => {
      html: string;
      text: string;
    };
    subject: string;
  }
> = {
  "2024-07-24": {
    template: renderEmail_2024_07_24,
    subject: "NN1 Dev Club #3",
  },
};

const TEMPLATE_MAPPER_EVENT: Record<
  string,
  {
    template: () => {
      html: string;
      text: string;
    };
    subject: string;
  }
> = {};

const fetchMembersEvent = async (eventId: number) => {
  const response = await fetch(`https://tickets.nn1.dev/${eventId}`, {
    headers: {
      Authorization: `Bearer ${Deno.env.get("API_KEY_TICKETS")}`,
    },
  });
  const responseJson: {
    data: {
      key: ["nn1-dev-tickets", number, string];
      value: {
        timestamp: string;
        eventId: number;
        name: string;
        email: string;
        confirmed: boolean;
      };
      versionstamp: string;
    }[];
  } = await response.json();
  return responseJson.data.filter((member) => member.value.confirmed);
};

const fetchMembersNewsletter = async () => {
  const response = await fetch(`https://newsletter.nn1.dev`, {
    headers: {
      Authorization: `Bearer ${Deno.env.get("API_KEY_NEWSLETTER")}`,
    },
  });
  const responseJson: {
    data: {
      key: ["nn1-dev-newsletter", string];
      value: {
        timestamp: string;
        email: string;
      };
      versionstamp: string;
    }[];
  } = await response.json();
  return responseJson.data;
};

type BodyNewsletter = {
  template: keyof typeof TEMPLATE_MAPPER_NEWSLETTER;
  audience: "newsletter";
};

type BodyEvent = {
  template: keyof typeof TEMPLATE_MAPPER_EVENT;
  audience: "event";
  eventId: number;
};

const isBroadcastAudienceNewsletter = (
  body: BodyNewsletter | BodyEvent,
): body is BodyNewsletter => body.audience === "newsletter";

const handlerPost = async (request: Request) => {
  const body: BodyNewsletter | BodyEvent = await request.json();
  const shouldBroadcastNewsletter = isBroadcastAudienceNewsletter(body);

  if (
    !Object.keys(
      shouldBroadcastNewsletter
        ? TEMPLATE_MAPPER_NEWSLETTER
        : TEMPLATE_MAPPER_EVENT,
    ).includes(body.template)
  ) {
    return Response.json(
      {
        status: "error",
        statusCode: 400,
        data: null,
        error: "Template is not configured",
      },
      { status: 400 },
    );
  }

  if (shouldBroadcastNewsletter) {
    const template =
      TEMPLATE_MAPPER_NEWSLETTER[
        body.template as keyof typeof TEMPLATE_MAPPER_NEWSLETTER
      ];

    const entries = await fetchMembersNewsletter();

    for (const entry of entries) {
      const email = template.template({
        unsubscribeUrl: `https://nn1.dev/newsletter/unsubscribe/${entry?.key[1]}`,
      });
      const { error } = await resend.emails.send({
        from: "NN1 Dev Club <club@nn1.dev>",
        to: entry.value.email,
        subject: template.subject,
        html: email.html,
        text: email.text,
      });

      error
        ? console.error(error)
        : console.log(`Email successfully sent to ${entry.value.email}`);
    }
  } else {
    const template =
      TEMPLATE_MAPPER_EVENT[
        body.template as keyof typeof TEMPLATE_MAPPER_EVENT
      ];

    const entries = await fetchMembersEvent(body.eventId);
    console.log({ entries });

    for (const entry of entries) {
      const email = template.template();
      const { error } = await resend.emails.send({
        from: "NN1 Dev Club <club@nn1.dev>",
        to: entry.value.email,
        subject: template.subject,
        html: email.html,
        text: email.text,
      });

      error
        ? console.error(error)
        : console.log(`Email successfully sent to ${entry.value.email}`);
    }
  }

  return Response.json(
    {
      status: "success",
      statusCode: 200,
      data: "Broadcast successful.",
      error: null,
    },
    { status: 200 },
  );
};

export default handlerPost;
