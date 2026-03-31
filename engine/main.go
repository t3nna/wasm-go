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

type dotProductRequest struct {
	A []float64 `json:"a"`
	B []float64 `json:"b"`
}

type dotProductResponse struct {
	Value  float64 `json:"value"`
	Length int     `json:"length"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func validateFiniteNonEmpty(numbers []float64, fieldName string) error {
	if len(numbers) == 0 {
		return errors.New(fieldName + " cannot be empty")
	}

	for _, value := range numbers {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return errors.New(fieldName + " contains invalid values")
		}
	}

	return nil
}

func computeVectorStats(numbers []float64) (vectorStatsResponse, error) {
	if err := validateFiniteNonEmpty(numbers, "numbers list"); err != nil {
		return vectorStatsResponse{}, err
	}

	var sum float64
	for _, value := range numbers {
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

func computeDotProduct(a []float64, b []float64) (dotProductResponse, error) {
	if err := validateFiniteNonEmpty(a, "vector a"); err != nil {
		return dotProductResponse{}, err
	}
	if err := validateFiniteNonEmpty(b, "vector b"); err != nil {
		return dotProductResponse{}, err
	}
	if len(a) != len(b) {
		return dotProductResponse{}, errors.New("vectors must have the same length")
	}

	var value float64
	for i := range a {
		value += a[i] * b[i]
	}

	return dotProductResponse{
		Value:  value,
		Length: len(a),
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

func dotProductJS(_ js.Value, args []js.Value) any {
	if len(args) != 1 {
		return marshalError(errors.New("dotProduct expects one JSON string argument"))
	}

	var request dotProductRequest
	if err := json.Unmarshal([]byte(args[0].String()), &request); err != nil {
		return marshalError(errors.New("invalid input JSON payload"))
	}

	result, err := computeDotProduct(request.A, request.B)
	if err != nil {
		return marshalError(err)
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return marshalError(errors.New("failed to marshal dot product response"))
	}

	return string(payload)
}

func registerFunctions() {
	js.Global().Set("vectorStats", js.FuncOf(vectorStatsJS))
	js.Global().Set("dotProduct", js.FuncOf(dotProductJS))
}

func main() {
	registerFunctions()
	select {}
}
