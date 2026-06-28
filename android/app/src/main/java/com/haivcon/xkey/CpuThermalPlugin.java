package com.haivcon.xkey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Locale;

@CapacitorPlugin(name = "CpuThermal")
public class CpuThermalPlugin extends Plugin {
    private static final String[] THERMAL_DIRS = {
        "/sys/class/thermal",
        "/sys/class/hwmon"
    };

    @PluginMethod
    public void getTemperature(PluginCall call) {
        ThermalReading reading = findBestReading();
        JSObject result = new JSObject();
        result.put("available", reading != null);
        result.put("sampledAt", System.currentTimeMillis());
        if (reading != null) {
            result.put("temperatureC", reading.temperatureC);
            result.put("source", reading.source);
            result.put("label", reading.label);
        }
        call.resolve(result);
    }

    private ThermalReading findBestReading() {
        ThermalReading bestCpu = null;

        for (String dirPath : THERMAL_DIRS) {
            File dir = new File(dirPath);
            File[] children = dir.listFiles();
            if (children == null) continue;

            for (File child : children) {
                if (!child.isDirectory()) continue;
                ThermalReading reading = readThermalChild(child);
                if (reading == null || !isCpuLike(reading.label)) continue;

                if (bestCpu == null || reading.temperatureC > bestCpu.temperatureC) {
                    bestCpu = reading;
                }
            }
        }

        return bestCpu;
    }

    private ThermalReading readThermalChild(File child) {
        String label = readFirstLine(new File(child, "type"));
        if (label == null || label.trim().isEmpty()) label = readFirstLine(new File(child, "name"));
        if (label == null || label.trim().isEmpty()) label = child.getName();

        File tempFile = new File(child, "temp");
        ThermalReading reading = readTemperatureFile(tempFile, child.getName(), label);
        if (reading != null) return reading;

        File[] files = child.listFiles();
        if (files == null) return null;
        ThermalReading best = null;
        for (File file : files) {
            String name = file.getName();
            if (!name.startsWith("temp") || !name.endsWith("_input")) continue;
            ThermalReading candidate = readTemperatureFile(file, child.getName() + "/" + name, label);
            if (candidate != null && (best == null || candidate.temperatureC > best.temperatureC)) best = candidate;
        }
        return best;
    }

    private ThermalReading readTemperatureFile(File file, String source, String label) {
        if (file == null || !file.isFile() || !file.canRead()) return null;
        String raw = readFirstLine(file);
        if (raw == null) return null;
        try {
            double value = Double.parseDouble(raw.trim());
            double temperatureC = normalizeTemperature(value);
            if (temperatureC < -20 || temperatureC > 130) return null;
            return new ThermalReading(temperatureC, source, label);
        } catch (Exception e) {
            return null;
        }
    }

    private double normalizeTemperature(double value) {
        if (Math.abs(value) >= 1000) return value / 1000.0;
        return value;
    }

    private String readFirstLine(File file) {
        if (file == null || !file.isFile() || !file.canRead()) return null;
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            return reader.readLine();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isCpuLike(String label) {
        String normalized = label == null ? "" : label.toLowerCase(Locale.US);
        return normalized.contains("cpu")
            || normalized.contains("soc")
            || normalized.contains("tsens")
            || normalized.contains("cluster")
            || normalized.contains("gold")
            || normalized.contains("silver")
            || normalized.contains("big")
            || normalized.contains("little")
            || normalized.matches(".*(^|[_-])ap([_-]|$).*");
    }

    private static class ThermalReading {
        final double temperatureC;
        final String source;
        final String label;

        ThermalReading(double temperatureC, String source, String label) {
            this.temperatureC = temperatureC;
            this.source = source;
            this.label = label;
        }
    }
}
