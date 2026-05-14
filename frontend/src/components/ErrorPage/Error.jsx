import { useRouteError } from "react-router-dom";
import styles from "./Error.module.css";

const ErrorPage = ({message, status}) => {
  // Try to get error from React Router (when used as errorElement)
  let routeError = null;
  try {
    routeError = useRouteError();
  } catch (e) {
    // Not inside a React Router error boundary — ignore
  }
  // Props take priority, then fall back to route error info
  const errorMessage = message || routeError?.data || routeError?.message || routeError?.statusText || "An unexpected error occurred";
  const errorStatus = status || routeError?.status || null;
  return (
    <div className={styles.errorPage}>
      <div className={styles.container}>
        {/* Error Icon */}
        <div className={styles.iconWrapper}>
          <div className={styles.icon}>
            ⚠
          </div>
        </div>

        {/* Error Status Code */}
        {errorStatus && (
          <div className={styles.status}>
            {errorStatus}
          </div>
        )}

        {/* Error Title */}
        <h1 className={styles.title}>
          Oops! Something went wrong
        </h1>


        {/* Error Details */}
        <div className={styles.details}>
          <p className={styles.message}>
            <strong>Error:</strong> {errorMessage}
          </p>
        </div>


        {/* Additional Help Text */}
        <div className={styles.footer}>
          <p className={styles.helpText}>
            If the problem persists, please check your internet connection or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;