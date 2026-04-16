import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (activitiesError) {
    return Response.json(
      { error: "Erro ao buscar atividades" },
      { status: 500 }
    );
  }

  const { data: checkins, error: checkinsError } = await supabase
    .from("activity_checkins")
    .select("activity_id, user_id, users(id, name, photo_url)");

  if (checkinsError) {
    return Response.json(
      { error: "Erro ao buscar checkins" },
      { status: 500 }
    );
  }

  const activitiesWithCheckins = activities.map((activity) => {
    const activityCheckins = checkins.filter(
      (c) => c.activity_id === activity.id
    );
    return {
      ...activity,
      checkin_count: activityCheckins.length,
      participants: activityCheckins.map((c) => c.users),
    };
  });

  return Response.json(activitiesWithCheckins);
}
