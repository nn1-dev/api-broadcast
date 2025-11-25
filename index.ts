import * as Sentry from "sentry";
import handlerPost from "./handlerPost.ts";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  tracesSampleRate: 1.0,
});

const HANDLER_MAPPER = {
  POST: handlerPost,
};

Deno.serve(async (request) => {
  const auth = request.headers.get("Authorization");

  if (auth !== `Bearer ${Deno.env.get("API_KEY")}`) {
    Sentry.captureMessage("Unauthorized API use", "warning");

    return Response.json(
      {
        status: "error",
        statusCode: 401,
        data: null,
        error: "Nice try 👍",
      },
      { status: 401 },
    );
  }

  return await HANDLER_MAPPER[request.method as keyof typeof HANDLER_MAPPER](
    request,
  );
});
