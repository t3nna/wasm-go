package main

import (
	"encoding/json"
	"errors"
	"math"
	"syscall/js"
)

type vectorStatsRequest struct {
	Numbers []float64 `json:"numbers"`
}

type vectorStatsResponse struct {
	Sum    float64 `json:"sum"`
	Mean   float64 `json:"mean"`
	Stddev float64 `json:"stddev"`
	Count  int     `json:"count"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func computeVectorStats(numbers []float64) (vectorStatsResponse, error) {
	if len(numbers) == 0 {
		return vectorStatsResponse{}, errors.New("numbers list cannot be empty")
	}

	var sum float64
	for _, value := range numbers {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return vectorStatsResponse{}, errors.New("numbers list contains invalid values")
		}
		sum += value
	}

	mean := sum / float64(len(numbers))

	var variance float64
	for _, value := range numbers {
		diff := value - mean
		variance += diff * diff
	}
	variance /= float64(len(numbers))

	return vectorStatsResponse{
		Sum:    sum,
		Mean:   mean,
		Stddev: math.Sqrt(variance),
		Count:  len(numbers),
	}, nil
}

func marshalError(err error) string {
	payload, marshalErr := json.Marshal(errorResponse{Error: err.Error()})
	if marshalErr != nil {
		return `{"error":"failed to marshal error response"}`
	}
	return string(payload)
}

func vectorStatsJS(_ js.Value, args []js.Value) any {
	if len(args) != 1 {
		return marshalError(errors.New("vectorStats expects one JSON string argument"))
	}

	var request vectorStatsRequest
	if err := json.Unmarshal([]byte(args[0].String()), &request); err != nil {
		return marshalError(errors.New("invalid input JSON payload"))
	}

	stats, err := computeVectorStats(request.Numbers)
	if err != nil {
		return marshalError(err)
	}

	payload, err := json.Marshal(stats)
	if err != nil {
		return marshalError(errors.New("failed to marshal vector stats response"))
	}

	return string(payload)
}

func registerFunctions() {
	js.Global().Set("vectorStats", js.FuncOf(vectorStatsJS))
}

func main() {
	registerFunctions()
	select {}
}
