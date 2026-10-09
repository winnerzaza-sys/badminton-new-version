import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";
import "./styles/icons.css";
import "./styles/material.css";
import { App as AntApp, ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import "dayjs/locale/th";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={thTH}
      theme={{
        components: {
          DatePicker: { cellWidth: 36, cellHeight: 32, timeCellHeight: 44 },
        },
        token: {
          colorPrimary: "#4775b2",
          colorPrimaryHover: "#3d6497",
          colorPrimaryActive: "#31557f",
          colorText: "#29384d",
          colorTextSecondary: "#5c6c80",
          fontFamily: '"Sarabun", Tahoma, sans-serif',
          fontSize: 16,
          borderRadius: 16,
          colorBorder: "#d2dff1",
          controlHeight: 44,
          controlHeightLG: 48,
          colorBgContainer: "#ffffff",
          motion: false,
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
