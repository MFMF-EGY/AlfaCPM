import { useState, useEffect, useRef } from "react";

function SuggestionsInput({ Type, Value, Suggestions, Disabled, onFocus, onChange, onSelect }) {

  const [showSuggestions, setShowSuggestions] = useState(false);
  const ContainerRef = useRef();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!ContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    if (showSuggestions){
      document.addEventListener("pointerdown", handleClickOutside);
      return () => {
        document.removeEventListener("pointerdown", handleClickOutside);
      };
    }
  }, [showSuggestions]);

  return (
    <div ref={ContainerRef} style={{ display: "inline-block" }}>
      <input
        type={Type}
        value={Value}
        disabled={Disabled}
        onFocus={()=>{
          setShowSuggestions(true);
          onFocus();
        }}
        onChange={(event) => {
          onChange(event);
        }}
        onBlur={(event) => {
          if (event.relatedTarget && !ContainerRef.current.contains(event.relatedTarget)) {
            setShowSuggestions(false);
          }
        }}
      />
      {showSuggestions && Suggestions.length > 0 && (
        <ul className="Drop-list">
          {Suggestions.map((suggestion, index) => (
            <li key={index}
              onClick={() => {
                setShowSuggestions(false);
                onSelect(index)
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default SuggestionsInput;