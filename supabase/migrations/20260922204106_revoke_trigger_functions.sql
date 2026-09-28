-- Fonctions déclenchées par des triggers : aucun compte n'a besoin de les
-- appeler directement. Les triggers continuent de fonctionner sans ce droit.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.protect_privileged_profile_columns() from authenticated;
revoke execute on function public.set_updated_at() from authenticated;
