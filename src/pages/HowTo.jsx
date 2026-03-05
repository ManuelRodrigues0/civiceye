import "../styles/howto.css";

export default function HowTo() {
  return (
    <div className="howto-container">

      <h1 className="howto-title">How CivicEye Works</h1>
      <p className="howto-sub">
        Report civic issues and verify cleanup using AI and location matching.
      </p>

      <div className="timeline">

        <div className="timeline-step">
          <div className="step-number">1</div>
          <div className="step-card">
            <div className="step-title">Report a Problem</div>
            <div className="step-desc">
              Take or upload a photo of garbage or a civic issue from the location.
              The system stores the image as the original report.
            </div>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-number">2</div>
          <div className="step-card">
            <div className="step-title">Location is Saved</div>
            <div className="step-desc">
              CivicEye records the GPS coordinates of the report to prevent
              fake cleanup verification from other locations.
            </div>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-number">3</div>
          <div className="step-card">
            <div className="step-title">Issue Appears on Map</div>
            <div className="step-desc">
              The reported issue becomes visible on the map so others can
              see and track the cleanup progress.
            </div>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-number">4</div>
          <div className="step-card">
            <div className="step-title">Cleanup Happens</div>
            <div className="step-desc">
              Authorities or volunteers clean the reported area.
            </div>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-number">5</div>
          <div className="step-card">
            <div className="step-title">Upload Cleanup Photo</div>
            <div className="step-desc">
              Click the report and upload a new photo from the same position
              and angle as the original image.
            </div>
          </div>
        </div>

        <div className="timeline-step">
          <div className="step-number">6</div>
          <div className="step-card">
            <div className="step-title">AI Verification</div>
            <div className="step-desc">
              CivicEye compares the before and after photos using AI.
              If similarity and cleanliness match, the issue is marked resolved.
            </div>
          </div>
        </div>

      </div>

      <div className="howto-note">
        Tip: For best verification, take the cleanup photo from the same spot
        and camera angle as the original report.
      </div>

    </div>
  );
}