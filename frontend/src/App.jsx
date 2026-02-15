import {createBrowserRouter, RouterProvider} from "react-router-dom"
import DownloadPage from "./components/DownloadPage/DownloadPage";
import UploadDataPage from "./components/UploadPage/UploadPage";
import RootLayout from "./components/Root/Root";
import LoginForm from "./components/LoginForm/LoginForm";
import ErrorPage from "./components/ErrorPage/Error";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DownloadPage />, errorElement: <ErrorPage /> },
      { path: "upload", element: <UploadDataPage />, errorElement: <ErrorPage /> },
      { path: "profile", element: <LoginForm />, errorElement: <ErrorPage /> },
      { path: "*", element: <ErrorPage msg = "Page not found" /> },
    ],
  },
]);

function App() { 
  return <RouterProvider router={router}></RouterProvider>;
}

export default App;
