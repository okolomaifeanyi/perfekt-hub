-- The country-news preference used to be a single boolean topic
-- ("topic:country_news") tied to the profile's one country field. It was
-- replaced by a plural, multi-select "country:{name}" namespace (see
-- 20260816000000_user_interests.sql's follow-up work), but visitors who had
-- already toggled the old topic kept a now-meaningless row behind — no
-- category is ever named "country_news", so it silently matched nothing in
-- every getInterestedNews() call it rode along in.
delete from public.user_interests
where interest_key = 'topic:country_news';
