import { Resend } from "npm:resend";
import * as Sentry from "https://deno.land/x/sentry@8.27.0/index.mjs";
import { renderEmailEvent_5_2025_01_01 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/event-5-2025-01-01.tsx";
import { renderEmailNewsletter_2024_12_09 } from "https://raw.githubusercontent.com/nn1-dev/emails/main/emails/newsletter-2024-12-09.tsx";
import { chunkArray } from "./utils.ts";

const resend = new Resend(Deno.env.get("API_KEY_RESEND"));
// https://resend.com/docs/api-reference/emails/send-batch-emails
const RESEND_MAX_BATCH_CHUNK = 100;

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
  "2024-12-09": {
    template: renderEmailNewsletter_2024_12_09,
    subject:
      "NN1 Dev Club #5: Hack & Share - a rundown of side projects by Northamptonshire geeks",
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
  "5-2025-01-01": {
    template: renderEmailEvent_5_2025_01_01,
    subject: "NN1 Dev Club #5 - See you soon 👋",
  },
};

const fetchMembersEvent = async (eventId: number) => {
  try {
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
  } catch {
    Sentry.captureException(new Error("Failed to fetch event members."));
    return [];
  }
};

const fetchMembersNewsletter = async () => {
  try {
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
  } catch {
    Sentry.captureException(new Error("Failed to fetch newsletter members."));
    return [];
  }
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

async function createEmailPayload(
  { to, subject, templatePromise }: {
    to: string;
    subject: string;
    templatePromise: () => Promise<{
      html: string;
      text: string;
    }>;
  },
) {
  const { html, text } = await templatePromise();

  return {
    from: "NN1 Dev Club <club@nn1.dev>",
    to,
    subject,
    html,
    text,
  };
}

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

  const data: string[] = [];

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

    const payloads = await Promise.all(
      entries.map((entry) =>
        createEmailPayload(
          {
            to: entry.value.email,
            subject: template.subject,
            templatePromise: () =>
              template.template({
                unsubscribeUrl: `https://nn1.dev/newsletter/unsubscribe/${
                  entry?.key[1]
                }`,
              }),
          },
        )
      ),
    );

    const payloadsChunked = chunkArray(payloads, RESEND_MAX_BATCH_CHUNK);

    try {
      for (const chunk of payloadsChunked) {
        await resend.batch.send(chunk);
      }
    } catch {
      Sentry.captureException(new Error("Emails scheduling failed."));
      return Response.json(
        {
          status: "error",
          statusCode: 500,
          data: null,
          error: "Failed to schedule an email.",
        },
        { status: 500 },
      );
    }

    data.push(...entries.map((item) => item.value.email));
  } else {
    const template = TEMPLATE_MAPPER_EVENT[
      body.template as keyof typeof TEMPLATE_MAPPER_EVENT
    ];

    const entries = await fetchMembersEvent(body.eventId);

    const payloads = await Promise.all(
      entries.map((entry) =>
        createEmailPayload(
          {
            to: entry.value.email,
            subject: template.subject,
            templatePromise: () => template.template(),
          },
        )
      ),
    );

    const payloadsChunked = chunkArray(payloads, RESEND_MAX_BATCH_CHUNK);

    try {
      for (const chunk of payloadsChunked) {
        await resend.batch.send(chunk);
      }
    } catch {
      Sentry.captureException(new Error("Emails scheduling failed."));
      return Response.json(
        {
          status: "error",
          statusCode: 500,
          data: null,
          error: "Failed to schedule an email.",
        },
        { status: 500 },
      );
    }

    data.push(...entries.map((item) => item.value.email));
  }

  return Response.json(
    {
      status: "success",
      statusCode: 200,
      data,
      error: null,
    },
    { status: 200 },
  );
};

export default handlerPost;
