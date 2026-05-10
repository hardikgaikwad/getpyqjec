import {
  NavLink,
  useSearchParams,
  useNavigate,
  Form,
  useNavigation,
  useActionData,
} from "react-router-dom";
import { useEffect } from "react";
import styles from "./LoginForm.module.css";
import { useAuth } from "../../store/AuthContext";

export default function LoginForm() {
  const navigation = useNavigation();
  const actionData = useActionData();
  const { login } = useAuth();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isLogin = mode === "login";
  if (mode !== "register" && mode !== "login") {
    const error = new Error("Invalid mode");
    error.status = 400;
    throw error;
  }
  useEffect(() => {
    if (actionData?.success) {
      login(actionData.access, actionData.user);
      navigate("/");
    }
  }, [actionData, login, navigate]);

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{isLogin ? "Login" : "Register"}</h1>

        <Form method="post" className={styles.form}>
          {!isLogin && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                required
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="rollno">
              Roll No.
            </label>
            <input
              id="rollno"
              name="rollno"
              type="text"
              className={styles.input}
              placeholder="0201IT221015"
              required
            />
          </div>

          {!isLogin && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="rollno">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={styles.input}
                placeholder="Full Name"
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={styles.input}
              placeholder="Password"
              required
              minLength={6}
            />
          </div>
          {isLogin && (
            <NavLink
              to="/forgot-password"
              className={styles.switchLink}
              style={{ fontSize: "13px", marginBottom: "8px" }}
            >
              Forgot Password?
            </NavLink>
          )}
          {actionData?.error && (
            <p className={styles.errorText}>{actionData.error}</p>
          )}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitBtn}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
          <h3 className={styles.infoText}>
            {isLogin
              ? "Don't have an account? Please Register!"
              : "If you already has an account, just sign in."}
          </h3>
          <NavLink
            to={`?mode=${isLogin ? "register" : "login"}`}
            onClick={(e) => isSubmitting && e.preventDefault()}
            style={isSubmitting ? { pointerEvents: "none", opacity: 0.5 } : {}}
            className={styles.switchLink}
          >
            {isLogin ? "Register" : "Login"}
          </NavLink>
        </Form>
      </div>
    </div>
  );
}

export async function action({ request }) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const mode = searchParams.get("mode");
    const formData = await request.formData();
    const body = {
      rno: formData.get("rollno"),
      password: formData.get("password"),
    };
    if (mode === "register") {
      body.email = formData.get("email");
      body.name = formData.get("name");
    }

    const response = await fetch("http://localhost:8000/auth/" + mode + "/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      if (response.status < 500) {
        const errorData = await response.json();
        return { error: errorData.error || errorData.detail || "Invalid credentials" };
      }
      throw new Response(response.statusText || "Server error", {
        status: response.status,
      });
    }
    const data = await response.json();
    return { success: true, access: data.access, user: data.user };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    throw new Response(
      "Could not connect to the server. Please try again later.",
      {
        status: 503,
      },
    );
  }
}
