export async function GET() {
  return Response.json({
    test: process.env.PAYMENT_TEST_MODE === "true",
  });
}
