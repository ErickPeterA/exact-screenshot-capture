import { createFileRoute, redirect } from "@tanstack/react-router";

const INSTITUTIONAL_SITE = "https://vgresultados.com.br/";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: INSTITUTIONAL_SITE, statusCode: 302 });
  },
});
