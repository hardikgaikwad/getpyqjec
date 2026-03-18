import {createBrowserRouter, RouterProvider} from "react-router-dom"
import DownloadPage from "./components/DownloadPage/DownloadPage";
import UploadDataPage from "./components/UploadPage/UploadPage";
import RootLayout from "./components/Root/Root";
import LoginForm from "./components/LoginForm/LoginForm";
import ErrorPage from "./components/ErrorPage/Error";

import {action as loginAction} from "./components/LoginForm/LoginForm";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DownloadPage />, errorElement: <ErrorPage /> },
      { path: "upload", element: <UploadDataPage />, errorElement: <ErrorPage /> },
      { path: "profile",action:loginAction, element: <LoginForm />, errorElement: <ErrorPage /> },
      { path: "*", element: <ErrorPage message = "Page not found" status = {404} /> },
    ],
  },
]);

function App() { 
  return <RouterProvider router={router}></RouterProvider>;
}

export default App;
