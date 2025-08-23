package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/vendor"

	"github.com/gorilla/mux"
)

type VendorHandler struct {
	createVendorUseCase      *vendor.CreateVendorInteractor
	getVendorsUseCase        *vendor.GetVendorsInteractor
	getVendorUseCase         *vendor.GetVendorInteractor
	getVendorsByTypeUseCase  *vendor.GetVendorsByTypeInteractor
}

func NewVendorHandler(
	createUC *vendor.CreateVendorInteractor,
	getVendorsUC *vendor.GetVendorsInteractor,
	getVendorUC *vendor.GetVendorInteractor,
	getVendorsByTypeUC *vendor.GetVendorsByTypeInteractor,
) *VendorHandler {
	return &VendorHandler{
		createVendorUseCase:     createUC,
		getVendorsUseCase:       getVendorsUC,
		getVendorUseCase:        getVendorUC,
		getVendorsByTypeUseCase: getVendorsByTypeUC,
	}
}

func (h *VendorHandler) GetVendors(w http.ResponseWriter, r *http.Request) {
	// Execute use case
	vendors, err := h.getVendorsUseCase.Execute()
	if err != nil {
		http.Error(w, "Failed to fetch vendors", http.StatusInternalServerError)
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.VendorResponseDTO, len(vendors))
	for i, v := range vendors {
		responseDTO[i] = h.vendorToDTO(v)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *VendorHandler) GetVendor(w http.ResponseWriter, r *http.Request) {
	// Parse path parameter
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid vendor ID", http.StatusBadRequest)
		return
	}

	// Execute use case
	v, err := h.getVendorUseCase.Execute(entities.VendorID(id))
	if err != nil {
		if err == entities.ErrVendorNotFound {
			http.Error(w, "Vendor not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to fetch vendor", http.StatusInternalServerError)
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.vendorToDTO(v)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *VendorHandler) GetVendorsByType(w http.ResponseWriter, r *http.Request) {
	// Parse path parameter
	vars := mux.Vars(r)
	vendorType := vars["type"]

	// Execute use case
	vendors, err := h.getVendorsByTypeUseCase.Execute(entities.VendorType(vendorType))
	if err != nil {
		if err == entities.ErrInvalidVendorType {
			http.Error(w, "Invalid vendor type", http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to fetch vendors", http.StatusInternalServerError)
		}
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.VendorResponseDTO, len(vendors))
	for i, v := range vendors {
		responseDTO[i] = h.vendorToDTO(v)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *VendorHandler) CreateVendor(w http.ResponseWriter, r *http.Request) {
	// Syntactic validation - decode JSON
	var requestDTO dto.CreateVendorRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&requestDTO); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Convert DTO to use case command
	cmd := vendor.CreateVendorCommand{
		Name: requestDTO.Name,
		Type: requestDTO.Type,
	}

	// Execute use case
	v, err := h.createVendorUseCase.Execute(cmd)
	if err != nil {
		if err == entities.ErrInvalidVendorType {
			http.Error(w, "Invalid vendor type", http.StatusBadRequest)
		} else if err == entities.ErrVendorAlreadyExists {
			http.Error(w, "Vendor with this name and type already exists", http.StatusConflict)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.vendorToDTO(v)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(responseDTO)
}

// Helper method to convert domain entity to DTO
func (h *VendorHandler) vendorToDTO(v *entities.Vendor) dto.VendorResponseDTO {
	return dto.VendorResponseDTO{
		ID:        int(v.ID()),
		Name:      v.Name(),
		Type:      string(v.Type()),
		CreatedAt: v.CreatedAt(),
		UpdatedAt: v.UpdatedAt(),
	}
}