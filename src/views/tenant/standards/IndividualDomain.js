import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-final-form'
import { useHistory, useLocation } from 'react-router-dom'
import useQuery from '../../../hooks/useQuery'
import { useLazyListDomainTestsQuery, useListDomainTestsQuery } from '../../../store/api/domains'
import {
  CBadge,
  CButton,
  CCallout,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CCol,
  CCollapse,
  CForm,
  CRow,
} from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faCircleNotch,
  faCompressAlt,
  faExclamationTriangle,
  faExpandAlt,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'
import { RFFCFormInput } from '../../../components/RFFComponents'
import classNames from 'classnames'

// const required = (value) => (value ? undefined : 'Required')

const IconGreenCheck = () => <FontAwesomeIcon icon={faCheckCircle} className="text-success mx-2" />
const IconRedX = () => <FontAwesomeIcon icon={faTimesCircle} className="text-danger mx-2" />
const IconWarning = () => (
  <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning mx-2" />
)

const bgColorMap = {
  [undefined]: 'bg-primary',
  Fail: 'bg-danger',
  Pass: 'bg-success',
  Warn: 'bg-warning',
}

const textColorMap = {
  [undefined]: 'text-white',
  Fail: 'text-white',
  Pass: 'text-white',
  Warn: 'text-black',
}

const IndividualDomainCheck = () => {
  const history = useHistory()
  const location = useLocation()
  const query = useQuery()
  const [domain, setDomain] = useState('')
  const [trigger, { data, isFetching, isSuccess, ...rest }] = useLazyListDomainTestsQuery()

  useEffect(() => {
    // check if domain query is set
    const domainQuery = query.get('domain')
    if (domainQuery) {
      setDomain(domainQuery)
      trigger({ domain: domainQuery })
    }
  }, [query, trigger])

  const onSubmit = (values) => {
    setDomain(values.domain)
    history.replace({ pathname: location.pathname, search: `?domain=${values.domain}` })
    trigger({ domain: values.domain })
  }

  return (
    <CCard className="bg-white rounded p-5">
      <CCardBody>
        <CRow className="mb-4">
          <CCol md={6}>
            <CCard>
              <CCardHeader className="bg-primary text-white">
                <CCardTitle>Email Security Domain Checker</CCardTitle>
              </CCardHeader>
              <CCardBody>
                <Form
                  initialValues={{ domain }}
                  onSubmit={onSubmit}
                  render={({ handleSubmit, submitting, pristine }) => {
                    return (
                      <CForm onSubmit={handleSubmit}>
                        <RFFCFormInput name="domain" label="Domain Name" />
                        <CButton type="submit" disabled={submitting || isFetching} className="mt-4">
                          {isFetching && (
                            <FontAwesomeIcon icon={faCircleNotch} spin size="1x" className="mx-1" />
                          )}
                          Check Domain
                        </CButton>
                      </CForm>
                    )
                  }}
                />
                <DomainCheckError domain={domain} {...rest} />
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={6}>{isSuccess && <MXResultsCard domain={domain} />}</CCol>
        </CRow>
        <CRow className="mb-4">
          <CCol md={6}>{isSuccess && <SPFResultsCard domain={domain} />}</CCol>
          <CCol md={6}>{isSuccess && <DMARCResultsCard domain={domain} />}</CCol>
        </CRow>
        <CRow className="mb-4">
          <CCol md={6}>{isSuccess && <DNSSECResultsCard domain={domain} />}</CCol>
          <CCol md={6}>{isSuccess && <DKIMResultsCard domain={domain} />}</CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default IndividualDomainCheck

const sharedProps = {
  domain: PropTypes.string,
}

const ResultsCard = ({ children, data, type }) => {
  if (!data) {
    return null
  }

  const results = data[`${type}Results`]
  // const passCount = data[`${type}PassCount`]
  // const warnCount = data[`${type}WarnCount`]
  // const failCount = data[`${type}FailCount`]
  const finalState = data[`${type}FinalState`]
  const validationPasses = results?.ValidationPasses || []
  const validationWarns = results?.ValidationWarns || []
  const validationFails = results?.ValidationFails || []

  return (
    <CCard>
      <CCardHeader className={classNames(bgColorMap[finalState], textColorMap[finalState])}>
        <CCardTitle>{type} Results</CCardTitle>
      </CCardHeader>
      <CCardBody>
        {/* records and additional information is specific to each type
         * child prop passed in adds the additional information
         * above the generic passes/fails report
         */}
        {children}
        {validationPasses.map((validation, idx) => (
          <div key={`${idx}-validation-${type}`}>
            <IconGreenCheck />
            {String(validation.replace('PASS: ', ''))}
          </div>
        ))}
        {validationWarns.map((validation, idx) => (
          <div key={`${idx}-validation-${type}`}>
            <IconWarning />
            {String(validation.replace('WARN: ', ''))}
          </div>
        ))}
        {validationFails.map((validation, idx) => (
          <div key={`${idx}-validation-${type}`}>
            <IconRedX />
            {String(validation.replace('FAIL: ', ''))}
          </div>
        ))}
      </CCardBody>
    </CCard>
  )
}

ResultsCard.propTypes = {
  data: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  type: PropTypes.oneOf(['MX', 'SPF', 'DMARC', 'DNSSEC', 'DKIM']),
}

const SPFResultsCard = ({ domain }) => {
  const { data } = useListDomainTestsQuery({ domain })
  let record = data?.SPFResults?.Record

  return (
    <ResultsCard data={data} type="SPF">
      <div className="bg-secondary text-white">{record}</div>
    </ResultsCard>
  )
}

SPFResultsCard.propTypes = sharedProps

const MXResultsCard = ({ domain }) => {
  const { data } = useListDomainTestsQuery({ domain })
  const mailProviderName = data?.MXResults?.MailProvider?.Name
  let records = data?.MXResults?.Records || []

  if (!Array.isArray(records)) {
    records = [records]
  }

  return (
    <ResultsCard data={data} type="MX">
      <div className="bg-secondary text-white">
        {records.map((record, key) => (
          <div key={`${key}-mx-record`}>
            {record?.Priority} {record?.Hostname}
            <br />
          </div>
        ))}
      </div>
      <CBadge className="bg-info">Mail Provider: {mailProviderName || 'Unknown'}</CBadge>
    </ResultsCard>
  )
}

MXResultsCard.propTypes = sharedProps

const DMARCResultsCard = ({ domain }) => {
  const { data } = useListDomainTestsQuery({ domain })
  let record = data?.DMARCResults?.Record

  return (
    <ResultsCard data={data} type="DMARC">
      <div className="bg-secondary text-white">{record}</div>
    </ResultsCard>
  )
}

DMARCResultsCard.propTypes = sharedProps

const DNSSECResultsCard = ({ domain }) => {
  const { data } = useListDomainTestsQuery({ domain })
  let keys = data?.DNSSECResults?.Keys

  if (!Array.isArray(keys)) {
    keys = [keys]
  }

  return (
    <ResultsCard data={data} type="DNSSEC">
      <div className="bg-secondary text-white">
        {keys.map((key, idx) => (
          <div key={`${idx}-dnssec-key`}>
            {key}
            <br />
          </div>
        ))}
      </div>
    </ResultsCard>
  )
}

DNSSECResultsCard.propTypes = sharedProps

const DKIMResultsCard = ({ domain }) => {
  const { data } = useListDomainTestsQuery({ domain })
  let records = data?.DKIMResults?.Records

  if (!Array.isArray(records)) {
    records = [records]
  }

  return (
    <ResultsCard data={data} type="DKIM">
      <div className="bg-secondary text-white">
        {records.map((record, idx) => (
          <div key={`${idx}-dkim-record`}>
            {record?.Record}
            <br />
          </div>
        ))}
      </div>
    </ResultsCard>
  )
}

DKIMResultsCard.propTypes = sharedProps

const DomainCheckError = (props) => {
  const [expanded, setExpanded] = useState(false)

  const { isError, domain, error } = props

  if (!isError) {
    return null
  }

  return (
    isError && (
      <CCallout color="danger">
        <div className="d-flex justify-content-between">
          <div>
            Unable to load domain check for <b>{domain}</b>
            <br />
            {error?.message}
          </div>
          <FontAwesomeIcon
            size="2x"
            style={{ padding: '3px' }}
            icon={expanded ? faCompressAlt : faExpandAlt}
            onClick={() => setExpanded(!expanded)}
          />
        </div>
        <CCollapse visible={expanded}>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </CCollapse>
      </CCallout>
    )
  )
}

DomainCheckError.propTypes = {
  error: PropTypes.object,
  isError: PropTypes.bool,
  domain: PropTypes.string,
}