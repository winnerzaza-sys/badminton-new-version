import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";
import { App as AntApp, ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import "dayjs/locale/th";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={thTH}
      theme={{
        components: {
          DatePicker: { cellWidth: 36, cellHeight: 32 },
        },
        token: {
          colorPrimary: "#1763d8",
          colorText: "#152442",
          colorTextSecondary: "#4c6281",
          fontFamily: '"Sarabun", Tahoma, sans-serif',
          fontSize: 16,
          borderRadius: 12,
          controlHeight: 44,
          controlHeightLG: 48,
          colorBgContainer: "#ffffff",
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
