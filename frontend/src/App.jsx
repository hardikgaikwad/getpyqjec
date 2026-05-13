import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DownloadPage from "./components/DownloadPage/DownloadPage";
import UploadDataPage from "./components/UploadPage/UploadPage";
import RootLayout from "./components/Root/Root";
import LoginForm from "./components/LoginForm/LoginForm";
import ErrorPage from "./components/ErrorPage/Error";
import ForgotPassword from "./components/ForgotPassword/ForgotPassword";
import ResetPassword from "./components/ResetPassword/ResetPassword";
import { AuthProvider } from "./store/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { action as loginAction } from "./components/LoginForm/LoginForm";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DownloadPage />, errorElement: <ErrorPage /> },
      {
        path: "upload",
        element: (
          <ProtectedRoute>
            <UploadDataPage />
          </ProtectedRoute>
        ),
        errorElement: <ErrorPage />,
      },
      {
        path: "profile",
        action: loginAction,
        element: <LoginForm />,
        errorElement: <ErrorPage />,
      },
      {
        path: "*",
        element: <ErrorPage message="Page not found" status={404} />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
        errorElement: <ErrorPage />,
      },
      {
        path: "reset-password/:uid/:token",
        element: <ResetPassword />,
        errorElement: <ErrorPage />,
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router}></RouterProvider>
    </AuthProvider>
  );
}

export default App;
