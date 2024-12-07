import { Resend } from "npm:resend";
import { renderEmail_2024_07_24 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-07-24.tsx";
import { renderEmail_2024_08_27 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-08-27.tsx";
import { renderEmail_2024_09_19 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/event-3-2024-09-19.tsx";
import { renderEmail_2024_09_24 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-09-24.tsx";
import { renderEmail_2024_09_25 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/event-3-2024-09-25.tsx";
import { renderEmail_2024_09_27 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/event-3-2024-09-27.tsx";
import { renderEmail_2024_11_27 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/event-4-2024-11-27.tsx";
import { renderEmail_2024_10_15 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-10-15.tsx";
import { renderEmail as renderEmail_2024_10_22 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-10-22.tsx";
import { renderEmail as renderEmail_2024_11_14 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-11-14.tsx";
import { renderEmail as renderEmail_2024_11_26 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-11-26.tsx";

const resend = new Resend(Deno.env.get("API_KEY_RESEND"));

const TEMPLATE_MAPPER_NEWSLETTER: Record<
  string,
  {
    template: (props: { unsubscribeUrl: string }) => Promise<{
      html: string;
      text: string;
    }>;
    subject: string;
  }
> = {
  "2024-07-24": {
    template: renderEmail_2024_07_24,
    subject: "NN1 Dev Club #3",
  },
  "2024-08-27": {
    template: renderEmail_2024_08_27,
    subject: "Co-working days & NN1 Dev Club #3",
  },
  "2024-09-24": {
    template: renderEmail_2024_09_24,
    subject: "NN1 Dev Club #3 - Last Chance to Get Your Ticket",
  },
  "2024-10-15": {
    template: renderEmail_2024_10_15,
    subject: "NN1 Dev Club #4",
  },
  "2024-10-22": {
    template: renderEmail_2024_10_22,
    subject: "Co-working day, Friday, 25/10/2024",
  },
  "2024-11-14": {
    template: renderEmail_2024_11_14,
    subject: "Last meet-up of 2024, January event, Discord server and more…",
  },
  "2024-11-26": {
    template: renderEmail_2024_11_26,
    subject: "Two days to go!",
  },
};

const TEMPLATE_MAPPER_EVENT: Record<
  string,
  {
    template: () => Promise<{
      html: string;
      text: string;
    }>;
    subject: string;
  }
> = {
  "2024-09-19": {
    template: renderEmail_2024_09_19,
    subject: "NN1 Dev Club #3 - We will see you in a week",
  },
  "2024-09-25": {
    template: renderEmail_2024_09_25,
    subject: "NN1 Dev Club #3 - See you tomorrow 👋",
  },
  "2024-09-27": {
    template: renderEmail_2024_09_27,
    subject: "Your feedback matters",
  },
  "2024-11-27": {
    template: renderEmail_2024_11_27,
    subject: "NN1 Dev Club #4 - See you tomorrow 👋",
  },
};

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
  excludeMembersEventId?: number;
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

  const sentSuccess: string[] = [];
  const sentError: string[] = [];

  if (shouldBroadcastNewsletter) {
    const template = TEMPLATE_MAPPER_NEWSLETTER[
      body.template as keyof typeof TEMPLATE_MAPPER_NEWSLETTER
    ];

    const membersNewsletter = await fetchMembersNewsletter();
    const membersExcluded = body.excludeMembersEventId
      ? await fetchMembersEvent(body.excludeMembersEventId)
      : [];

    const entries = membersNewsletter.filter(
      (memberNewsletter) =>
        !membersExcluded.some(
          (memberEvent) =>
            memberEvent.value.email === memberNewsletter.value.email,
        ),
    );

    console.log({ entriesLength: entries.length });
    console.log({ entries: entries.map((entry) => entry.value.email) });

    for (const entry of entries) {
      const email = await template.template({
        unsubscribeUrl: `https://nn1.dev/newsletter/unsubscribe/${
          entry?.key[1]
        }`,
      });
      const { error } = await resend.emails.send({
        from: "NN1 Dev Club <club@nn1.dev>",
        to: entry.value.email,
        subject: template.subject,
        html: email.html,
        text: email.text,
      });

      (error ? sentError : sentSuccess).push(entry.value.email);
    }
  } else {
    const template = TEMPLATE_MAPPER_EVENT[
      body.template as keyof typeof TEMPLATE_MAPPER_EVENT
    ];

    const entries = await fetchMembersEvent(body.eventId);

    console.log({ entriesLength: entries.length });
    console.log({ entries: entries.map((entry) => entry.value.email) });

    for (const entry of entries) {
      const email = await template.template();
      const { error } = await resend.emails.send({
        from: "NN1 Dev Club <club@nn1.dev>",
        to: entry.value.email,
        subject: template.subject,
        html: email.html,
        text: email.text,
        headers: {
          "List-Unsubscribe": "<mailto:club@nn1.dev?subject=Unsubscribe>",
        },
      });

      (error ? sentError : sentSuccess).push(entry.value.email);
    }
  }

  return Response.json(
    {
      status: "success",
      statusCode: 200,
      data: {
        sentSuccess,
        sentError,
      },
      error: null,
    },
    { status: 200 },
  );
};

export default handlerPost;
