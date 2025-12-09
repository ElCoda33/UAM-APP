"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as go from 'gojs';
import { IAssetAPI } from '@/lib/schema';
import { Spinner } from "@heroui/react";

export const NetworkDiagram = () => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<IAssetAPI[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/assets?all=true');
        if (response.ok) {
          const data = await response.json();
          // Filter for assets that have an IP address and are likely IT assets
          const networkAssets = data.filter((asset: IAssetAPI) =>
            asset.ip_address && asset.ip_address.trim() !== '' &&
            (asset.asset_type === 'informatica' || asset.it_device_type)
          );
          setAssets(networkAssets);
        }
      } catch (error) {
        console.error("Error fetching assets for network diagram:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  useEffect(() => {
    if (loading || !diagramRef.current || assets.length === 0) return;

    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      layout: $(go.LayeredDigraphLayout, {
        direction: 90,
        layerSpacing: 40,
        columnSpacing: 20,
        setsPortSpots: false
      })
    });

    // Define Node Template
    diagram.nodeTemplate =
      $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { fill: "white", stroke: "#E2E8F0", strokeWidth: 2 },
          new go.Binding("fill", "color")),
        $(go.Panel, "Vertical", { margin: 8 },
          $(go.TextBlock, { font: "bold 12px Inter, sans-serif", margin: 2 },
            new go.Binding("text", "name")),
          $(go.TextBlock, { font: "10px Inter, sans-serif", stroke: "#64748B" },
            new go.Binding("text", "ip")),
          $(go.TextBlock, { font: "italic 10px Inter, sans-serif", stroke: "#94A3B8" },
            new go.Binding("text", "type"))
        )
      );

    diagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.Orthogonal, corner: 5 },
        $(go.Shape, { strokeWidth: 2, stroke: "#94A3B8" }),
        $(go.Shape, { toArrow: "Standard", stroke: "#94A3B8", fill: "#94A3B8" })
      );

    // Define Group Template (Subnets)
    diagram.groupTemplate =
      $(go.Group, "Auto",
        { layout: $(go.GridLayout, { wrappingColumn: 2, cellSize: new go.Size(1, 1), spacing: new go.Size(10, 10) }) },
        $(go.Shape, "Rectangle", { fill: "rgba(241, 245, 249, 0.5)", stroke: "#CBD5E1", strokeWidth: 1 }),
        $(go.Panel, "Vertical",
          $(go.Panel, "Horizontal", { stretch: go.GraphObject.Horizontal, background: "#F1F5F9" },
            $("SubGraphExpanderButton", { alignment: go.Spot.Right, margin: 5 }),
            $(go.TextBlock, { font: "bold 14px Inter, sans-serif", margin: 5, stroke: "#334155" },
              new go.Binding("text", "key"))
          ),
          $(go.Placeholder, { padding: 10 })
        )
      );

    // Process Data
    const nodeDataArray: any[] = [];
    const subnets = new Set<string>();

    assets.forEach(asset => {
      const ip = asset.ip_address!;
      const subnet = ip.substring(0, ip.lastIndexOf('.')); // Simple subnet extraction (C class assumption)

      if (!subnets.has(subnet)) {
        subnets.add(subnet);
        nodeDataArray.push({ key: subnet, isGroup: true });
      }

      let color = "#DBEAFE"; // Default Blue
      if (asset.it_device_type === 'server') color = "#FEE2E2"; // Red
      if (asset.it_device_type === 'printer') color = "#FEF3C7"; // Amber
      if (asset.it_device_type === 'switch' || asset.it_device_type === 'router') color = "#D1FAE5"; // Green

      nodeDataArray.push({
        key: asset.id,
        name: asset.product_name,
        ip: asset.ip_address,
        type: asset.it_device_type || 'Device',
        group: subnet,
        color: color
      });
    });

    const linkDataArray = assets
      .filter(asset => asset.uplink_asset_id)
      .map(asset => ({
        from: asset.uplink_asset_id,
        to: asset.id
      }));

    diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);

    return () => {
      diagram.div = null;
    };
  }, [loading, assets]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-default-500">
        <p>No se encontraron activos informáticos con dirección IP configurada.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border border-default-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 relative">
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm text-xs text-slate-500 z-10">
        Agrupado por Subred
      </div>
      <div ref={diagramRef} className="w-full h-full" />
    </div>
  );
};
