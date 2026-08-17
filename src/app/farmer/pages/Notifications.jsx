import { useEffect } from "react";
import { useNavigate } from "react-router";
function NotificationsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/insights", { replace: true });
  }, [navigate]);
  return null;
}
export {
  NotificationsPage as default
};
