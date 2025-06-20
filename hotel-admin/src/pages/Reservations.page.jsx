import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Modal, Button, Form, Spinner } from "react-bootstrap";
import PaginatedTable from "../components/PaginatedTable";
import { Table, Pagination } from "react-bootstrap";
import TableFilterBar from "../components/TableFilterWithDate";
import axios from "../config/axiosConfig";
import Badge from "react-bootstrap/Badge";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "react-toastify";

const Reservations = () => {
  const [originalData, setOriginalData] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const fechaDefault = new Date();
  const fechaManhana = new Date();
  fechaManhana.setDate(fechaDefault.getDate() + 1);
  const queryParams = new URLSearchParams(location.search);
  const fechaSeleccionada = queryParams.get("fecha");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState();
  const [sortKey, setSort] = useState("creacion");
  const [filteredData, setFilteredData] = useState(originalData);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [show, setShow] = useState(false); // mostrar o no el modal
  const [razon, setRazon] = useState("");
  const [reservas, setReservas] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [fechaDesde, setFechaDesde] = useState(fechaDefault);
  const [fechaHasta, setFechaHasta] = useState(fechaManhana);
  const [fechaModificada, setFechaModificada] = useState(false);

  const getEstadoString = (statusId) => {
    switch (statusId) {
      case 1:
        return "Pendiente";
      case 2:
        return "Confirmada";
      case 3:
        return "Cancelada";
      case 4:
        return "Check-In";
      case 5:
        return "Check-Out";
      case 6:
        return "Rechazada";
      default:
        return "Desconocido"
    }
  };

  const getStatusBadge = (statusId) => {
    switch (statusId) {
      case 1:
        return <Badge bg="warning">Pendiente</Badge>;
      case 2:
        return <Badge bg="success">Confirmada</Badge>;
      case 3:
        return <Badge bg="danger">Cancelada</Badge>;
      case 4:
        return <Badge bg="primary">Check-In</Badge>;
      case 5:
        return <Badge bg="dark">Check-Out</Badge>;
      case 6:
        return <Badge bg="secondary">Rechazada</Badge>;
    }
  };
  const headers = [
    { key: "id", label: "ID" },
    { key: "codigo", label: "Código" },
    { key: "nombreCliente", label: "Cliente" },
    { key: "numsHabitaciones", label: "Habitación(es)" },
    { key: "fechaIngreso", label: "Ingreso" },
    { key: "fechaSalida", label: "Salida" },
    { key: "llegada", label: "Llegada" },
    { key: "estadoId", label: "Estado" },
  ];

  useEffect(() => {
    axios.get("Reservas")
      .then(response => {
        console.log(response.data)
          const limpio = response.data.sort((a, b) => new Date(b.creacion) - new Date(a.creacion)).map(({ id, codigo, fechaIngreso, fechaSalida, estadoId, detalles, llegadaEstimada, nombreCliente, creacion }) => {
          const parsedIngreso = parseISO(fechaIngreso);
          const parsedSalida = parseISO(fechaSalida);
          const numsHabitaciones = detalles ? detalles.map(d => d.numeroHabitacion || 'Sin habitación').join(', ') : "N/A";
          return {
            id,
            codigo,
            creacion,
            nombreCliente: nombreCliente,
            numsHabitaciones: numsHabitaciones,
            fechaIngreso: isValid(parsedIngreso) ? format(parsedIngreso, 'dd/MM/yyyy') : '',
            fechaSalida: isValid(parsedSalida) ? format(parsedSalida, 'dd/MM/yyyy') : '',
            ingresoISO: fechaIngreso,
            salidaISO: fechaSalida,
            llegada: llegadaEstimada?.slice(0, 5) || '',
            estadoId: getStatusBadge(estadoId),
            estadoString: getEstadoString(estadoId)
          };
        });
        setReservas(limpio);
        setFilteredData(limpio);
        setOriginalData(limpio);
        setLoading(false);
      })
      .catch((error) => console.error("Error obteniendo reservas:", error));
  }, []);

  // array de acciones para la tabla
  const actions = [
    {
      icon: <i className="material-icons">visibility</i>,
      label: "Ver",
      onClick: (rowData) => {
        navigate(`/reservations/${rowData.id}`);
      },
    },
    {
      icon: <i className="material-icons">edit</i>,
      label: "Editar",
      onClick: (rowData) => {
        navigate(`/reservations/edit/${rowData.id}`);
      },
    },
    {
      icon: <i className="material-icons">cancel</i>,
      label: "Cancelar",
      onClick: (rowData) => {
        setFilaSeleccionada(rowData);
        setRazon("");
        setShow(true);
      },
    },
  ];

  useEffect(() => {
    // Filtrar los datos originales según la fecha seleccionada y estado de reserva
    if (fechaSeleccionada) {
      const [anho, mes, dia] = fechaSeleccionada.split("-");
      const fechaSel = new Date(anho, mes - 1, dia);

      const reservasFiltradas = originalData.filter((reserva) => {
        const fechaIngresoStr = reserva.ingresoISO.split("T")[0];
        const fechaSalidaStr = reserva.salidaISO.split("T")[0];

        const [anhoIngreso, mesIngreso, diaIngreso] =
          fechaIngresoStr.split("-");
        const ingreso = new Date(anhoIngreso, mesIngreso - 1, diaIngreso);

        const [anhoSalida, mesSalida, diaSalida] = fechaSalidaStr.split("-");
        const salida = new Date(anhoSalida, mesSalida - 1, diaSalida);
        
        return fechaSel >= ingreso && fechaSel <= salida;
      });
      setFilteredData(reservasFiltradas);
    } else {
      // Si no hay fecha seleccionada, mostramos todos los datos originales
      setFilteredData(originalData);
    }
  }, [fechaSeleccionada, originalData]);

  const onSearch = () => {
    // filtramos los datos
    setFilteredData(
      originalData.filter((client) =>
        Object.values(client)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    );
  };

  const onBtnClick = () => {
    navigate("/reservations/new");
  };

  // revierte los datos filtrados en la busqueda a los originales
  const clearSearch = () => {
    setFilteredData(originalData);
  };

  // funcion para manejar el cierre del modal
  const handleClose = () => setShow(false);

  useEffect(() => {
    if (fechaSeleccionada) {
      return;
    }
    if (!fechaModificada) {
      setFilteredData(originalData);
      return;
    }

    if (!fechaDesde || !fechaHasta) {
      setFilteredData(originalData);
      return;
    }

    const desde = new Date(fechaDesde);
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);

    const filtradas = originalData.filter((reserva) => {
      const ingreso = new Date(reserva.ingresoISO);
      return ingreso >= desde && ingreso <= hasta;
    });

    setFilteredData(filtradas);
  }, [fechaDesde, fechaHasta, fechaModificada, originalData]);


  const handleEliminar = () => {
    // Actualizamos los datos localmente
    let updatedData = filteredData.map((reserv) =>
      reserv.id === filaSeleccionada.id
        ? { ...reserv, estadoId: getStatusBadge(3) }
        : reserv
    );
    setFilteredData(updatedData);

    // Preparamos el payload para la cancelación
    const payload = {
      // No enviamos 'id' porque se genera automáticamente.
      detalleReservaId: null,
      reservaId: filaSeleccionada.id,
      motivo: razon, // El motivo que el usuario ingresó
      activo: true,
    };

    // Enviamos la cancelación a la API
    axios
      .post("/Cancelacions", payload)
      .then((response) => {
        toast.success("Reserva cancelada correctamente");
      })
      .catch((error) => {
        toast.error("Error al cancelar la reserva: ");
      });

    // Cerramos el modal
    setShow(false);
  };

  // sort options
  const sortOptions = [
    { value: 'id', label: 'ID' },
    { value: 'nombreCliente', label: 'Nombre' },
    { value: 'codigo', label: 'Código' },
    { value: 'ingresoISO', label: 'Check-In' },
    { value: 'salidaISO', label: 'Check-Out' },
    { value: 'creacion', label: 'Fecha de Creación' },
  ];

  //  ordenar los datos
  let sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    let result = 0;

    if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
      result = new Date(aVal).getTime() - new Date(bVal).getTime();
    } else if (!isNaN(aVal) && !isNaN(bVal)) {
      //console.log("ORDENANDO POR NUM")
      result = Number(aVal) - Number(bVal);
    } else {
      const aStr = aVal?.toString().toLowerCase() || "";
      const bStr = bVal?.toString().toLowerCase() || "";
      result = aStr.localeCompare(bStr);
    }

    return sortOrder === "asc" ? result : -result;
  });

  const sortedDataFormatted = sortedData.map((reserva) => ({
    ...reserva,
    numsHabitaciones: reserva.numsHabitaciones || "Sin habitación",
  }));

  // formatear la fecha
  const obtenerFormatoFecha = (fechaStr) => {
    const [anio, mes, dia] = fechaStr.split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    const opcionesDia = { weekday: "long" };
    const opcionesFecha = { year: "numeric", month: "2-digit", day: "2-digit" };

    const diaSemana = fecha.toLocaleDateString("es-ES", opcionesDia);
    const fechaFormateada = fecha.toLocaleDateString("es-ES", opcionesFecha);

    return {
      diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
      fechaFormateada,
    };
  };

  return (
    <Container className="px-5" fluid>
      <div className="d-flex align-items-center mb-4">
        {fechaSeleccionada && (
          <span
            className="material-icons me-2"
            role="button"
            onClick={() => navigate(-1)}
            style={{ cursor: "pointer" }}
            title="Volver"
          >
            arrow_back
          </span>
        )}
        <h1>Reservas</h1>
      </div>
      {/*Subtitulo de fecha y dia seleccionados */}
      {fechaSeleccionada && (
        <div className="mb-3">
          <h5 className="text-muted">
            Día: {obtenerFormatoFecha(fechaSeleccionada).diaSemana}
            <br />
            Fecha: {obtenerFormatoFecha(fechaSeleccionada).fechaFormateada}
          </h5>
        </div>
      )}
      <TableFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={onSearch}
        clearSearch={clearSearch}
        sortOptions={sortOptions}
        sortKey={sortKey}
        setSort={setSort}
        showBtn={true}
        btnText="Crear Reserva"
        onBtnClick={onBtnClick}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        startDate={fechaDesde}
        endDate={fechaHasta}
        setStartDate={setFechaDesde}
        setEndDate={setFechaHasta}
        setFechaModificada={setFechaModificada}
        showDateSelect = {fechaSeleccionada ? false : true}
      />

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <PaginatedTable
          headers={headers}
          data={sortedDataFormatted}
          rowsPerPage={10}
          rowActions={actions}
        />
      )}

      {/*modal de eliminacion*/}
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {filaSeleccionada && (
            <>
              <p> ¿Estás seguro de que deseas cancelar la reserva?</p>
              <p>
                <strong>Cliente:</strong> {filaSeleccionada.nombreCliente}
              </p>
              <p>
                <strong>Habitación(es):</strong>{" "}
                {filaSeleccionada.numsHabitaciones}
              </p>
              <Form.Group controlId="razonEliminacion">
                <Form.Label>Razón de la cancelación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={razon}
                  onChange={(e) => setRazon(e.target.value)}
                  placeholder="Escriba la razón aquí..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Volver
          </Button>
          <Button variant="danger" onClick={handleEliminar}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Reservations;
